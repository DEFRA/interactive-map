// src/core/PluginInits.jsx
import React, { useEffect } from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { withPluginApiContexts, usePluginApiState } from './pluginApiWrapper.js'
import { useInterfaceAPI } from '../hooks/useInterfaceAPI.js'
import { useHintsAPI } from '../hooks/useHintsAPI.js'
import { useConfig } from '../store/configContext.js'
import { useEvaluateProp } from '../hooks/useEvaluateProp.js'
import { useButtonStateEvaluator } from '../hooks/useButtonStateEvaluator.js'
import { useContinueEnabledEvaluator } from '../hooks/useContinueEnabledEvaluator.js'

// Create a component for each plugin to handle its hooks properly
const PluginInit = ({ plugin }) => {
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

  if (!InitComponent) {
    return null
  }

  const WrappedInit = withPluginContexts(InitComponent, {
    pluginId: plugin.id,
    pluginConfig
  })

  return <WrappedInit />
}

export const PluginInits = () => {
  const { pluginRegistry } = useConfig()

  // Add button, panel and control API methods (Needs to be top-level)
  useInterfaceAPI()

  // Wire the showHint()/dismissHint() public API onto the hints service
  useHintsAPI()

  // Evaluate reactive button states globally
  const evaluateProp = useEvaluateProp()
  useButtonStateEvaluator(evaluateProp)
  useContinueEnabledEvaluator()

  return (
    <>
      {pluginRegistry.registeredPlugins.map((plugin, idx) => (
        <PluginInit
          key={`init-${plugin.id}-${idx}`}
          plugin={plugin}
          evaluateProp={evaluateProp}
        />
      ))}
    </>
  )
}
