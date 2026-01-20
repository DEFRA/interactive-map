// src/core/renderers/mapControls.js
import React from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { allowedSlots } from './slots.js'

/**
 * Map controls for a given slot and app state.
 * Returns an array of control descriptors.
 */
export function mapControls ({ slot, appState, evaluateProp }) {
  const { breakpoint, mode, pluginRegistry, controlConfig } = appState

  return Object.values(controlConfig)
    .filter(control => {
      const bpConfig = control[breakpoint]
      if (!bpConfig) {
        return false
      }

      const slotAllowed = allowedSlots.control.includes(bpConfig.slot)
      const inModeWhitelist = control.includeModes?.includes(mode) ?? true
      const inExcludeModes = control.excludeModes?.includes(mode) ?? false

      // Skip controls marked as inline:false when not in fullscreen mode
      if (control.inline === false && !appState.isFullscreen) {
        return false
      }

      // Only include controls allowed in slot and current mode
      return inModeWhitelist && !inExcludeModes && bpConfig.slot === slot && slotAllowed
    })
    .map(control => {
      // Detect plugin owning this control
      const plugin = pluginRegistry.registeredPlugins.find(p =>
        p.manifest?.controls?.some(c => c.id === control.id)
      )

      const pluginId = plugin?.id

      let element

      // If dynamic HTML control
      if (control.html) {
        element = (
          <div
            className='im-c-control'
            key={control.id}
            dangerouslySetInnerHTML={{ __html: evaluateProp(control.html, pluginId) }}
          />
        )
      } else {
        // Plugin control: wrap render with plugin context
        const Wrapped = withPluginContexts(control.render, {
          pluginId,
          pluginConfig: plugin?.config
        })
        element = <Wrapped key={control.id} />
      }

      return {
        id: control.id,
        type: 'control',
        order: control[breakpoint]?.order ?? 0,
        element
      }
    })
}
