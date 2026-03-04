// src/core/renderers/pluginWrapper.js
import { useMemo } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { usePlugin } from '../store/PluginProvider.jsx'
import { getIconRegistry } from '../registry/iconRegistry.js'

/**
 * Cache for storing wrapped components
 *
 * Using the original component function as the key ensures that each plugin component
 * is wrapped exactly once. This prevents unnecessary unmounting and remounting in React,
 * which can break state and focus management.
 *
 * @type {Map<Function, React.ComponentType>}
 */
export const wrapperCache = new Map()

/**
 * Wraps a plugin component and injects all necessary context and plugin state
 *
 * This function returns a stable React component type that:
 * - Always receives app-level context: config, appState, mapState
 * - Always receives core services: eventBus, announcer, reverseGeocode, etc
 * - Always receives plugin-level config from the manifest
 * - Always receives plugin-specific state from PluginProvider
 * - Receives mapProvider from appConfig
 *
 * The wrapper is cached to ensure that React sees the same component type across renders.
 * Without caching, each call would produce a new component type, causing unmounts
 * and remounts of child components, which can break focus, local state, or other effects.
 *
 * @param {Function} Component - The original plugin component (can be anonymous)
 * @param {Object} options
 * @param {string} options.pluginId - The unique ID of the plugin
 * @param {Object} options.pluginConfig - Static plugin configuration applied at implementation time
 * @returns {React.ComponentType} - The wrapped component with all contexts injected
 */
export function withPluginContexts (Component, { pluginId, pluginConfig }) {
  const key = Component

  if (!wrapperCache.has(key)) {
    wrapperCache.set(key, function WrappedComponent (props) {
      const appConfig = useConfig()
      const appState = useApp()
      const mapState = useMap()
      const services = useService()
      const pluginState = usePlugin(pluginId)

      return (
        <Component
          {...props}
          pluginConfig={pluginConfig}
          pluginState={pluginState}
          appConfig={appConfig}
          appState={appState}
          mapState={mapState}
          services={services}
          mapProvider={appConfig.mapProvider}
          iconRegistry={getIconRegistry()}
          buttonConfig={useMemo(() => Object.fromEntries(
            Object.entries(appState.buttonConfig).filter(
              ([_, btn]) => btn.pluginId === pluginId
            )
          ), [appState.buttonConfig])}
        />
      )
    })
  }

  return wrapperCache.get(key)
}
