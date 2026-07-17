// src/core/hooks/useEvaluateProp.js
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { useContext } from 'react'
import { PluginContext } from '../store/PluginProvider.jsx'
import { getIconRegistry } from '../registry/iconRegistry.js'

export function useEvaluateProp () {
  const appConfig = useConfig()
  const appState = useApp()
  const mapState = useMap()
  const services = useService()
  const pluginContext = useContext(PluginContext)

  const ctx = {
    appConfig,
    appState,
    mapState,
    services,
    mapProvider: appConfig?.mapProvider,
    iconRegistry: getIconRegistry()
  }

  function buildPluginContext (pluginId) {
    if (!pluginId) { return { pluginStates: pluginContext?.state ?? {} } }

    const pluginEntry = appConfig.pluginRegistry.registeredPlugins.find(p => p.id === pluginId)
    const pluginConfig = pluginEntry ? { pluginId: pluginEntry.id, ...pluginEntry.config } : {}

    // Only include isolated plugin state when the plugin has registered a reducer.
    // Framework entries like 'appConfig' have no reducer so their buttons get pluginStates instead.
    if (Object.hasOwn(pluginContext?.state ?? {}, pluginId)) {
      const stateForPlugin = pluginContext?.state?.[pluginId] ?? {}
      // Scope dispatch to this plugin, mirroring usePlugin — the combined reducer
      // routes by action.pluginId, so an unscoped dispatch would be a no-op.
      const pluginState = {
        ...stateForPlugin,
        dispatch: (action) => pluginContext?.dispatch?.({ ...action, pluginId })
      }
      return { pluginConfig, pluginState }
    }

    return { pluginConfig, pluginStates: pluginContext?.state ?? {} }
  }

  function evaluateProp (prop, pluginId) {
    const fullContext = { ...ctx, ...buildPluginContext(pluginId) }
    return typeof prop === 'function' ? prop(fullContext) : prop
  }

  evaluateProp.ctx = ctx
  return evaluateProp
}
