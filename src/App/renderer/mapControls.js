// src/core/renderers/mapControls.js
import React from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { allowedSlots } from './slots.js'
import { isConsumerHtml } from './slotHelpers.js'
import { hidesNothing } from './applicationModes.js'
import { stringToKebab } from '../../utils/stringToKebab.js'

/**
 * Map controls for a given slot and app state.
 * Returns an array of control descriptors.
 */
export function mapControls ({ slot, appState, evaluateProp, isHiddenByApplicationMode = hidesNothing }) {
  const { breakpoint, pluginRegistry, controlConfig } = appState

  return Object.values(controlConfig)
    .filter(control => { // NOSONAR, extracting to a helper wouldn't necessarily improve readability
      // Consumer HTML controls are managed by HtmlElementHost
      if (isConsumerHtml(control)) {
        return false
      }

      const bpConfig = control[breakpoint]
      if (!bpConfig) {
        return false
      }

      // Dynamic exclusion
      if (typeof control.excludeWhen === 'function' && evaluateProp(control.excludeWhen, control.pluginId)) {
        return false
      }

      // A control may also target a panel's body directly via the `<panelId>-panel`
      // slot convention (mirrors the `<buttonId>-button` convention panels already use).
      const slotAllowed = allowedSlots.control.includes(bpConfig.slot) || bpConfig.slot?.endsWith('-panel')

      // Skip controls marked as inline:false when not in fullscreen mode
      if (control.inline === false && !appState.isFullscreen) {
        return false
      }

      // Only include controls allowed in this slot
      return bpConfig.slot === slot && slotAllowed
    })
    .map(control => {
      // Detect plugin owning this control
      const plugin = pluginRegistry.registeredPlugins.find(p =>
        p.manifest?.controls?.some(c => c.id === control.id)
      )

      const pluginId = plugin?.id
      const isHidden = isHiddenByApplicationMode({ ids: [control.id], pluginId })

      let element

      // If dynamic HTML control
      if (control.html) {
        element = (
          <div
            className={`im-c-control im-c-control--${stringToKebab(control.id)}`}
            key={control.id}
            hidden={isHidden}
            dangerouslySetInnerHTML={{ __html: evaluateProp(control.html, pluginId) }}
          />
        )
      } else {
        // Plugin control: wrap render with plugin context
        const Wrapped = withPluginContexts(control.render, {
          pluginId,
          pluginConfig: plugin?.config
        })
        // Core's own element around the plugin's control, as MapButton's wrapper is for buttons and
        // Panel's root for panels — so hiding it (application mode) never remounts it: display:
        // contents leaves layout untouched while shown, hidden hides it with its state intact.
        // --{id} identifies it (as im-c-button-wrapper--{id} does).
        element = (
          <div
            key={control.id}
            className={`im-c-control-wrapper im-c-control-wrapper--${stringToKebab(control.id)}`}
            hidden={isHidden}
          >
            <Wrapped />
          </div>
        )
      }

      return {
        id: control.id,
        type: 'control',
        order: control[breakpoint]?.order ?? 0,
        tab: control[breakpoint]?.tab,
        element
      }
    })
}
