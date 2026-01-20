// src/core/renderers/mapPanels.js
import React from 'react'
import { stringToKebab } from '../../utils/stringToKebab.js'
import { withPluginContexts } from './pluginWrapper.js'
import { Panel } from '../components/Panel/Panel.jsx'
import { allowedSlots } from './slots.js'

export function mapPanels ({ slot, appState, evaluateProp }) {
  const { breakpoint, pluginRegistry, panelConfig, mode, openPanels } = appState

  const openPanelEntries = Object.entries(openPanels)

  const modalPanels = openPanelEntries.filter(([panelId]) => {
    const cfg = panelConfig[panelId]?.[breakpoint]
    return cfg?.modal
  })
  const allowedModalPanelId = modalPanels.length > 0 ? modalPanels[modalPanels.length - 1][0] : null

  return openPanelEntries.map(([panelId, { props }]) => {
    const config = panelConfig[panelId]

    if (!config) {
      return null
    }

    const bpConfig = config[breakpoint]
    if (!bpConfig) {
      return null
    }

    // Slot constriant: modal panels have a dedicated slot
    let targetSlot = bpConfig.modal ? 'modal' : bpConfig.slot

    // Slot constraint: bottom slot only permitted for mobile, revert to inset
    if (targetSlot === 'bottom' && ['tablet', 'desktop'].includes(breakpoint)) {
      targetSlot = 'inset'
    }

    const isNextToButton = `${stringToKebab(panelId)}-button` === targetSlot
    const slotAllowed = allowedSlots.panel.includes(targetSlot) || isNextToButton
    const inModeWhitelist = config.includeModes?.includes(mode) ?? true
    const inExcludeModes = config.excludeModes?.includes(mode) ?? false

    if (!slotAllowed || !inModeWhitelist || inExcludeModes) {
      return null
    }

    // Skip panels marked as inline:false when not in fullscreen mode
    if (config.inline === false && !appState.isFullscreen) {
      return null
    }

    if (targetSlot !== slot) {
      return null
    }

    if (bpConfig.modal && panelId !== allowedModalPanelId) {
      return null
    }

    const plugin = pluginRegistry.registeredPlugins.find(p => p.id === config.pluginId)
    const pluginId = plugin?.id

    const WrappedChild = config.render
      ? withPluginContexts(config.render, {
        ...props,
        pluginId,
        pluginConfig: plugin?.config
      })
      : null

    return {
      id: panelId,
      type: 'panel',
      order: bpConfig.order ?? 0,
      element: (
        <Panel
          key={panelId}
          panelId={panelId}
          panelConfig={config}
          props={props}
          WrappedChild={WrappedChild}
          label={evaluateProp(config.label, pluginId)}
          html={pluginId ? evaluateProp(config.html, pluginId) : config.html}
        />
      )
    }
  })
    .filter(Boolean)
}
