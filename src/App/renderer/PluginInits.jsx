// src/core/PluginInits.jsx
import React, { useEffect } from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { withPluginApiContexts, usePluginApiState } from './pluginApiWrapper.js'
import { useInterfaceAPI } from '../hooks/useInterfaceAPI.js'
import { useApp } from '../store/appContext.js'
import { useConfig } from '../store/configContext.js'
import { useEvaluateProp } from '../hooks/useEvaluateProp.js'
import { useButtonStateEvaluator } from '../hooks/useButtonStateEvaluator.js'

// Create a component for each plugin to handle its hooks properly
const PluginInit = ({ plugin, mode }) => {
  const stateRef = usePluginApiState(plugin.id)

  // Wrap all API functions
  useEffect(() => {
    if (plugin.api && plugin._originalPlugin) {
      Object.entries(plugin.api).forEach(([key, fn]) => {
        plugin._originalPlugin[key] = withPluginApiContexts(fn, {
          pluginId: plugin.id,
          pluginConfig: plugin?.config || {},
          stateRef
        })
      })
    }
  }, [plugin, stateRef])

  const { InitComponent } = plugin
  const { api, ...pluginConfig } = plugin?.config || {}

  // Check if valid mode for plugin
  const { includeModes, excludeModes } = plugin.config || {}
  const inModeWhitelist = includeModes?.includes(mode) ?? true
  const inExcludeModes = excludeModes?.includes(mode) ?? false

  if (!inModeWhitelist || inExcludeModes || !InitComponent) {
    return null
  }

  const WrappedInit = withPluginContexts(InitComponent, {
    pluginId: plugin.id,
    pluginConfig
  })

  return <WrappedInit />
}

export const PluginInits = () => {
  const { mode } = useApp()
  const { pluginRegistry } = useConfig()

  // Add button, panel and control API methods (Needs to be top-level)
  useInterfaceAPI()

  // Evaluate reactive button states globally
  const evaluateProp = useEvaluateProp()
  useButtonStateEvaluator(evaluateProp)

  return (
    <>
      {pluginRegistry.registeredPlugins.map((plugin, idx) => (
        <PluginInit
          key={`init-${plugin.id}-${idx}`}
          plugin={plugin}
          mode={mode}
          evaluateProp={evaluateProp}
        />
      ))}
    </>
  )
}
