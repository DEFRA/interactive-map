// src/core/renderers/mapPanels.js
import React from 'react'
import { withPluginContexts } from './pluginWrapper.js'
import { Panel } from '../components/Panel/Panel.jsx'
import { resolveTargetSlot, isConsumerHtml, isPanelSlotEligible, getAllowedModalPanelId } from './slotHelpers.js'
import { hidesNothing } from './applicationModes.js'
import { mapControls } from './mapControls.js'
import { orderItems } from './orderItems.js'
import { groupIntoTabs } from './groupIntoTabs.js'
import { stringToKebab } from '../../utils/stringToKebab.js'
import { logger } from '../../services/logger.js'

/**
 * Maps every configured panel eligible for the given layout slot (or, with no slot, for every
 * slot) to a renderable entry — open or closed alike, so a button's aria-controls id always resolves to a stable, permanently-mounted
 * <Panel> (hidden when closed). buildPanelBody only runs while open, so nothing expensive mounts
 * before then.
 */
// Consumer HTML panels are managed by HtmlElementHost; the rest need a breakpoint config and to
// be eligible for this slot. Returns null (skip) or the pieces the caller needs.
const getEligiblePanelConfig = (panelId, panelConfig, breakpoint, { slot, isFullscreen }) => {
  const config = panelConfig[panelId]
  if (!config || isConsumerHtml(config)) {
    return null
  }
  const bpConfig = config[breakpoint]
  if (!bpConfig) {
    return null
  }
  const targetSlot = resolveTargetSlot(bpConfig, breakpoint)
  if (!isPanelSlotEligible(config, { targetSlot, slot, isFullscreen })) {
    return null
  }
  return { config, bpConfig, targetSlot }
}

// A losing modal panel (see getAllowedModalPanelId) still gets a shell — it's just not open.
const resolveIsOpen = (openEntry, bpConfig, panelId, allowedModalPanelId) =>
  Boolean(openEntry) && (!bpConfig.modal || panelId === allowedModalPanelId)

// controlsBySlot (optional): controls already mapped for every slot, so a panel body can look up
// its `<panelId>-panel` controls instead of mapping them again.
export function mapPanels ({ slot, appState, evaluateProp, isHiddenByApplicationMode = hidesNothing, controlsBySlot }) {
  const { breakpoint, pluginRegistry, panelConfig, openPanels } = appState

  // Only the most-recently-opened modal panel is ever actually shown — see isOpen below.
  const allowedModalPanelId = getAllowedModalPanelId(openPanels, panelConfig, breakpoint)

  return Object.keys(panelConfig).map((panelId) => {
    const eligible = getEligiblePanelConfig(panelId, panelConfig, breakpoint, { slot, isFullscreen: appState.isFullscreen })
    if (!eligible) {
      return null
    }
    const { config, bpConfig, targetSlot } = eligible

    const openEntry = openPanels[panelId]
    const isOpen = resolveIsOpen(openEntry, bpConfig, panelId, allowedModalPanelId)
    const { props = {}, focusOnOpen } = openEntry ?? {}

    const plugin = pluginRegistry.registeredPlugins.find(p => p.id === config.pluginId)
    const pluginId = plugin?.id

    const isHidden = isHiddenByApplicationMode({ ids: [panelId], pluginId, isModal: !!bpConfig.modal })

    const html = pluginId ? evaluateProp(config.html, pluginId) : config.html
    const label = evaluateProp(config.label, pluginId)

    return {
      id: panelId,
      type: 'panel',
      slot: targetSlot,
      order: bpConfig.order ?? 0,
      element: (
        <Panel
          key={panelId}
          panelId={panelId}
          panelConfig={config}
          props={props}
          focusOnOpen={focusOnOpen}
          isOpen={isOpen}
          isHidden={isHidden}
          {...(isOpen ? buildPanelBody({ panelId, config, bpConfig, props, plugin, pluginId, html, label, appState, evaluateProp, isHiddenByApplicationMode, controlsBySlot }) : {})}
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
function buildPanelBody ({ panelId, config, bpConfig, props, plugin, pluginId, html, label, appState, evaluateProp, isHiddenByApplicationMode, controlsBySlot }) {
  const panelSlot = `${stringToKebab(panelId)}-panel`
  const injectedItems = controlsBySlot
    ? controlsBySlot.get(panelSlot) ?? []
    : mapControls({ slot: panelSlot, appState, evaluateProp, isHiddenByApplicationMode })

  if (html) {
    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'production' && injectedItems.length > 0) {
      logger.warn(`Panel "${panelId}" uses static html — controls targeting its slot are not rendered.`)
    }
    return {}
  }

  let ownItem = null
  if (config.render) {
    const WrappedChild = withPluginContexts(config.render)
    ownItem = { id: panelId, order: 0, tab: bpConfig.tab, element: <WrappedChild {...props} pluginId={pluginId} pluginConfig={plugin?.config} /> }
  }

  const allItems = ownItem ? [ownItem, ...injectedItems] : injectedItems

  const tabs = groupIntoTabs({ items: allItems, fallbackLabel: label })

  return tabs ? { tabs } : { items: orderItems(allItems) }
}
