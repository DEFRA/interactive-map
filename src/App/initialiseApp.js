import { createRoot } from 'react-dom/client'
import { EVENTS as events } from '../config/events.js'
import { defaultAppConfig } from '../config/appConfig.js'
import { createButtonRegistry } from './registry/buttonRegistry.js'
import { createPanelRegistry } from './registry/panelRegistry.js'
import { createControlRegistry } from './registry/controlRegistry.js'
import { createPluginRegistry } from './registry/pluginRegistry.js'
import { setProviderSupportedShortcuts } from './registry/keyboardShortcutRegistry.js'
import { mergeManifests } from './registry/mergeManifests.js'
import { App } from './App.jsx'

const rootMap = new WeakMap()
const mapProviderMap = new WeakMap()
const registryMap = new WeakMap()

export async function initialiseApp (rootElement, {
  MapProvider: MapProviderClass,
  mapProviderConfig,
  mapFramework,
  plugins = [],
  ...restProps
}) {
  const { eventBus } = restProps

  // Reuse or create mapProvider
  let mapProvider = mapProviderMap.get(rootElement)
  if (!mapProvider) {
    mapProvider = new MapProviderClass({ mapFramework, mapProviderConfig, events, eventBus })
    mapProviderMap.set(rootElement, mapProvider)
  }

  // Register provider-supported shortcuts
  if (mapProvider.capabilities?.supportedShortcuts) {
    setProviderSupportedShortcuts(mapProvider.capabilities.supportedShortcuts)
  }

  // Reuse or create registries (persist across app open/close cycles)
  let registries = registryMap.get(rootElement)
  if (!registries) {
    const buttonRegistry = createButtonRegistry()
    const panelRegistry = createPanelRegistry()
    const controlRegistry = createControlRegistry()
    const pluginRegistry = createPluginRegistry({
      registerButton: buttonRegistry.registerButton,
      registerPanel: panelRegistry.registerPanel,
      registerControl: controlRegistry.registerControl
    })

    registries = { buttonRegistry, panelRegistry, controlRegistry, pluginRegistry }
    registryMap.set(rootElement, registries)
  }

  const { buttonRegistry, panelRegistry, controlRegistry, pluginRegistry } = registries
  const { registerPlugin } = pluginRegistry

  // Clear previous plugins (but keep runtime additions)
  pluginRegistry.clear()

  // Register default appConfig as a plugin
  registerPlugin({
    id: 'appConfig',
    manifest: defaultAppConfig
  })

  // Create root if not already present
  let root = rootMap.get(rootElement)
  if (!root) {
    root = createRoot(rootElement)
    rootMap.set(rootElement, root)
  }

  const appInstance = {
    _root: root,

    // Direct references instead of bound functions for easier testing
    on: eventBus.on,
    off: eventBus.off,
    emit: eventBus.emit,

    unmount () {
      root.unmount()
      rootMap.delete(rootElement)
      mapProvider.destroyMap?.()
      mapProviderMap.delete(rootElement)
      pluginRegistry.clear()
    }
  }

  // Load plugins
  for (const plugin of plugins) {
    if (typeof plugin.load === 'function') {
      const module = await plugin.load()
      const { id: pluginId, load, manifest: overrideManifest, ...config } = plugin
      const { InitComponent, api, reducer, ...baseManifest } = module

      // Merge runtime overrides with module manifest
      const manifest = mergeManifests(baseManifest, overrideManifest)

      registerPlugin({
        id: pluginId,
        InitComponent,
        api,
        reducer,
        config,
        manifest,
        _originalPlugin: plugin
      })
    }
  }

  root.render(<App
    {...restProps}
    buttonRegistry={buttonRegistry}
    panelRegistry={panelRegistry}
    controlRegistry={controlRegistry}
    pluginRegistry={pluginRegistry}
    mapProvider={mapProvider}
              />)

  return appInstance
}
