// src/core/renderers/mapControls.js
import React from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { allowedSlots } from './slots.js'
import { isConsumerHtml, isHiddenByExclusiveControl } from './slotHelpers.js'

/**
 * Map controls for a given slot and app state.
 * Returns an array of control descriptors.
 */
export function mapControls ({ slot, appState, evaluateProp }) {
  const { breakpoint, mode, pluginRegistry, controlConfig } = appState

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
      const isHidden = isHiddenByExclusiveControl(appState.exclusiveControl, { ids: [control.id], pluginId })

      let element

      // If dynamic HTML control
      if (control.html) {
        element = (
          <div
            className='im-c-control'
            key={control.id}
            style={isHidden ? { display: 'none' } : undefined}
            dangerouslySetInnerHTML={{ __html: evaluateProp(control.html, pluginId) }}
          />
        )
      } else {
        // Plugin control: wrap render with plugin context
        const Wrapped = withPluginContexts(control.render, {
          pluginId,
          pluginConfig: plugin?.config
        })
        // Always wrapped, so hiding it (exclusive control) never remounts it: display: contents
        // leaves layout untouched while shown, display: none hides it with its state intact. The
        // --hidden modifier lets slot CSS ignore it (e.g. the header's trailing gap).
        element = (
          <div
            key={control.id}
            className={`im-c-control-wrapper${isHidden ? ' im-c-control-wrapper--hidden' : ''}`}
            style={{ display: isHidden ? 'none' : 'contents' }}
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
