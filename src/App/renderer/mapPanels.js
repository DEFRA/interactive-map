// src/core/renderers/mapPanels.js
import React from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { Panel } from '../components/Panel/Panel.jsx'
import { allowedSlots } from './slots.js'
import { resolveTargetSlot, isModeAllowed, isConsumerHtml } from './slotHelpers.js'
import { mapControls } from './mapControls.js'
import { orderItems } from './orderItems.js'
import { groupIntoTabs } from './groupIntoTabs.js'
import { stringToKebab } from '../../utils/stringToKebab.js'
import { logger } from '../../services/logger.js'

/**
 * Determines whether a panel should be rendered in the given slot.
 * Checks slot eligibility, mode restrictions, inline/fullscreen constraints,
 * and ensures only the topmost modal panel is shown.
 */
const isPanelVisible = (panelId, config, bpConfig, { targetSlot, slot, mode, isFullscreen, allowedModalPanelId }) => {
  const isNextToButton = targetSlot.endsWith('-button')
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
  const allowedModalPanelId = modalPanels.length > 0 ? modalPanels[modalPanels.length - 1][0] : null // NOSONAR, .at() is only Chrome 90+

  return openPanelEntries.map(([panelId, { props, focusOnOpen }]) => {
    const config = panelConfig[panelId]
    if (!config) {
      return null
    }

    // Consumer HTML panels are managed by HtmlElementHost
    if (isConsumerHtml(config)) {
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

    const html = pluginId ? evaluateProp(config.html, pluginId) : config.html
    const label = evaluateProp(config.label, pluginId)

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
          focusOnOpen={focusOnOpen}
          {...buildPanelBody({ panelId, config, bpConfig, props, plugin, pluginId, html, label, appState, evaluateProp })}
          label={label}
          html={html}
        />
      )
    }
  })
    .filter(Boolean)
}

/**
 * Builds a panel's body: its own render content (if any) plus any controls registered against
 * its `<panelId>-panel` slot by other plugins, merged with `orderItems` — or, when two or more
 * distinct `tab`s are present among them, grouped into tabs instead (see `groupIntoTabs`).
 * Static-html panels don't build a body — dangerouslySetInnerHTML can't host injected content,
 * so any controls targeting one are silently skipped (with a dev warning).
 *
 * @returns {{ items?: object[], tabs?: object[] }} spread directly onto `<Panel>` — exactly one
 *   of `items`/`tabs` is set (or neither, for a static-html panel).
 */
function buildPanelBody ({ panelId, config, bpConfig, props, plugin, pluginId, html, label, appState, evaluateProp }) {
  const injectedItems = mapControls({
    slot: `${stringToKebab(panelId)}-panel`,
    appState,
    evaluateProp
  })

  if (html) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'production' && injectedItems.length > 0) {
      logger.warn(`Panel "${panelId}" uses static html — controls targeting its slot are not rendered.`)
    }
    return {}
  }

  let ownItem = null
  if (config.render) {
    const WrappedChild = withPluginContexts(config.render, {
      ...props,
      pluginId,
      pluginConfig: plugin?.config
    })
    ownItem = { id: panelId, order: 0, tab: bpConfig.tab, element: <WrappedChild {...props} /> }
  }

  const allItems = ownItem ? [ownItem, ...injectedItems] : injectedItems

  const tabs = groupIntoTabs({ items: allItems, fallbackLabel: label })

  return tabs ? { tabs } : { items: orderItems(allItems) }
}
