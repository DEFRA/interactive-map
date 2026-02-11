// src/core/renderers/mapPanels.js
import React from 'react'
import { stringToKebab } from '../../utils/stringToKebab.js'
import { withPluginContexts } from './pluginWrapper.js'
import { Panel } from '../components/Panel/Panel.jsx'
import { allowedSlots } from './slots.js'

/**
 * Resolves the target slot for a panel based on its breakpoint config.
 * Modal panels always render in the 'modal' slot, and the bottom slot
 * is only available on mobile — tablet and desktop fall back to 'inset'.
 */
const resolveTargetSlot = (bpConfig, breakpoint) => {
  if (bpConfig.modal) {
    return 'modal'
  }
  if (bpConfig.slot === 'bottom' && ['tablet', 'desktop'].includes(breakpoint)) {
    return 'inset'
  }
  return bpConfig.slot
}

/**
 * Checks whether the current application mode permits the panel to be shown,
 * based on its includeModes and excludModes configuration.
 */
const isModeAllowed = (config, mode) => {
  if (config.includeModes && !config.includeModes.includes(mode)) {
    return false
  }
  if (config.excludeModes?.includes(mode)) {
    return false
  }
  return true
}

/**
 * Determines whether a panel should be rendered in the given slot.
 * Checks slot eligibility, mode restrictions, inline/fullscreen constraints,
 * and ensures only the topmost modal panel is shown.
 */
const isPanelVisible = (panelId, config, bpConfig, { targetSlot, slot, mode, isFullscreen, allowedModalPanelId }) => {
  const isNextToButton = `${stringToKebab(panelId)}-button` === targetSlot
  if (!allowedSlots.panel.includes(targetSlot) && !isNextToButton) {
    return false
  }
  if (!isModeAllowed(config, mode)) {
    return false
  }
  if (config.inline === false && !isFullscreen) {
    return false
  }
  if (targetSlot !== slot) {
    return false
  }
  if (bpConfig.modal && panelId !== allowedModalPanelId) {
    return false
  }
  return true
}

/**
 * Maps open panels to renderable entries for a given layout slot.
 * Filters panels by slot, breakpoint, mode, and modal state, then wraps
 * each panel's render function with the appropriate plugin contexts.
 */
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

    const targetSlot = resolveTargetSlot(bpConfig, breakpoint)

    if (!isPanelVisible(panelId, config, bpConfig, {
      targetSlot, slot, mode, isFullscreen: appState.isFullscreen, allowedModalPanelId
    })) {
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
