// src/core/renderers/mapButtons.js
import { MapButton } from '../components/MapButton/MapButton.jsx'
import { allowedSlots } from './slots.js'
import { groupByKey } from './groupByKey.js'
import { orderItems } from './orderItems.js'
import { logger } from '../../services/logger.js'

function getMatchingButtons ({ appState, buttonConfig, slot, evaluateProp }) {
  const { breakpoint, mode } = appState
  if (!buttonConfig) {
    return []
  }

  return Object.entries(buttonConfig).filter(([_, config]) => { // NOSONAR, extractig to a hleper wouldn't necessarily improve readability
    const bpConfig = config[breakpoint]

    // Skip menu items — they render inside a parent button's popup, not in a slot
    if (config.isMenuItem) {
      return false
    }

    // Dynamic exclusion
    if (typeof config.excludeWhen === 'function' && evaluateProp(config.excludeWhen, config.pluginId)) {
      return false
    }
    if (config.includeModes && !config.includeModes?.includes(mode)) {
      return false
    }
    if (config.excludeModes?.includes(mode)) {
      return false
    }

    // Skip buttons marked as inline:false when not in fullscreen mode
    if (config.inline === false && !appState.isFullscreen) {
      return false
    }

    // Skip panel-toggle buttons when the panel is non-dismissible (always visible) at this breakpoint
    if (config.panelId) {
      const panelBpConfig = appState.panelConfig?.[config.panelId]?.[breakpoint]
      if (panelBpConfig?.open === true && panelBpConfig?.dismissible === false) {
        return false
      }
    }

    if (bpConfig?.slot !== slot || !allowedSlots.button.includes(bpConfig.slot)) {
      return false
    }

    return true
  })
}

function createButtonClickHandler (config, appState, evaluateProp) {
  const isPanelOpen = !!(config.panelId && appState.openPanels[config.panelId])
  const isToggle = config.isPressed !== undefined || !!config.pressedWhen

  return (e) => {
    if (typeof config.onClick === 'function') {
      config.onClick(e, evaluateProp(ctx => ctx, config.pluginId))
      if (!isToggle && !config.keepFocus) {
        requestAnimationFrame(() => appState.layoutRefs.viewportRef.current?.focus())
      }
      return
    }

    if (config.panelId) {
      const triggeringElement = e.currentTarget
      appState.dispatch({
        type: isPanelOpen ? 'CLOSE_PANEL' : 'OPEN_PANEL',
        payload: isPanelOpen
          ? config.panelId
          : { panelId: config.panelId, props: { triggeringElement }, ...(config.keepFocus && { focusOnOpen: false }) }
      })
    }
  }
}

function applySlotExclusivity (matching, appState) {
  let exclusivePluginId = null

  for (const [id, config] of matching) {
    if (config.exclusiveSlot && !appState.hiddenButtons.has(id) && config.pluginId) {
      if (exclusivePluginId !== null && exclusivePluginId !== config.pluginId) {
        logger.warn(`Slot exclusivity conflict: plugins [${exclusivePluginId}, ${config.pluginId}] are both claiming exclusive slot ownership. Showing all buttons.`)
        return matching
      }
      exclusivePluginId = config.pluginId
    }
  }

  if (exclusivePluginId === null) { return matching }

  return matching.filter(([_, config]) => config.pluginId === exclusivePluginId)
}

/**
 * Builds the props for a <SlotButton>. isHidden/variant are included here (not just derived
 * inside SlotButton) because Actions.jsx also reads them directly off the 'actions' slot's
 * immediate children via React.Children.toArray — they need to be top-level props on whatever
 * element ends up there, not just used internally to build MapButton.
 */
const slotButtonProps = ({ buttonId, config, appState, appConfig, evaluateProp }) => ({
  buttonId,
  config,
  appState,
  appConfig,
  evaluateProp,
  isHidden: appState.hiddenButtons.has(buttonId),
  variant: config.variant
})

/**
 * Renders a single button's MapButton element for its slot, computing its click handler
 * and derived state (panel-open, showLabel fallback, etc.) from its config and appState.
 */
function SlotButton ({ buttonId, config, appState, appConfig, evaluateProp }) {
  const bpConfig = config[appState.breakpoint] ?? {}
  const handleClick = createButtonClickHandler(config, appState, evaluateProp)
  const isPanelOpen = !!(config.panelId && appState.openPanels[config.panelId])

  return (
    <MapButton
      buttonId={buttonId}
      iconId={evaluateProp(config.iconId, config.pluginId)}
      iconSvgContent={evaluateProp(config.iconSvgContent, config.pluginId)}
      variant={config.variant}
      label={evaluateProp(config.label, config.pluginId)}
      href={evaluateProp(config.href, config.pluginId)}
      showLabel={bpConfig.showLabel ?? true}
      isDisabled={appState.disabledButtons.has(buttonId)}
      isHidden={appState.hiddenButtons.has(buttonId)}
      isPressed={(config.isPressed !== undefined || config.pressedWhen) ? appState.pressedButtons.has(buttonId) : undefined}
      isExpanded={(config.isExpanded !== undefined || config.expandedWhen) ? appState.expandedButtons.has(buttonId) : undefined}
      isPanelOpen={isPanelOpen}
      onClick={handleClick}
      panelId={config.panelId}
      menuItems={config.menuItems}
      idPrefix={appConfig.id}
      ariaControls={evaluateProp(config.ariaControls, config.pluginId)}
    />
  )
}

/**
 * Ungrouped buttons — one result item per button, ordered by its own breakpoint-level
 * slot position.
 */
function buildUngroupedItems (members, ctx) {
  return members.map(([buttonId, config]) => ({
    id: buttonId,
    type: 'button',
    order: config[ctx.breakpoint]?.order ?? 0,
    element: <SlotButton key={buttonId} {...slotButtonProps({ buttonId, config, ...ctx })} />
  }))
}

/**
 * A named group's own slot order/label come from whichever member is encountered first —
 * unlike panel tabs (see groupIntoTabs.js), this is never derived from members' own order:
 * groups render simultaneously (not one-at-a-time like tabs), so an unspecified order
 * defaults to 0, same as every other slot item, rather than borrowing a member's position.
 * A single-member group still degrades to a plain button (no wrapping container), but keeps
 * the group's own slot order rather than falling back to its own breakpoint-level order.
 */
function buildGroupItem (key, members, ctx) {
  const [, firstConfig] = members[0]
  const order = firstConfig.group.slotOrder ?? 0

  /* istanbul ignore next */
  if (process.env.NODE_ENV !== 'production') {
    const distinctOrders = new Set(members.map(([, config]) => config.group?.slotOrder ?? 0))
    if (distinctOrders.size > 1) {
      logger.warn(`Button group "${firstConfig.group.label}" has inconsistent slotOrder values (${[...distinctOrders].join(', ')}) across its members — using ${order} (the first member's).`)
    }
  }

  if (members.length < 2) {
    const [buttonId, config] = members[0]
    return {
      id: buttonId,
      type: 'button',
      order,
      element: <SlotButton key={buttonId} {...slotButtonProps({ buttonId, config, ...ctx })} />
    }
  }

  // Order members within the group the same way panel/control content orders within a tab
  const sorted = orderItems(members.map(([buttonId, config]) => ({
    id: buttonId,
    order: config[ctx.breakpoint]?.order ?? 0,
    buttonId,
    config
  })))

  return {
    id: `group-${key}`,
    type: 'group',
    order,
    element: (
      <div key={`group-${key}`} role='group' aria-label={firstConfig.group.label} className='im-c-button-group'>{/* NOSONAR - div with role="group" is correct for a button group */}
        {sorted.map(({ buttonId, config }) => <SlotButton key={buttonId} {...slotButtonProps({ buttonId, config, ...ctx })} />)}
      </div>
    )
  }
}

function mapButtons ({ slot, appState, appConfig, evaluateProp }) {
  const { buttonConfig, breakpoint } = appState

  const raw = getMatchingButtons({ appState, appConfig, buttonConfig, slot, evaluateProp })
  const matching = applySlotExclusivity(raw, appState)

  if (!matching.length) {
    return []
  }

  // Partition into named groups (keyed by kebab-cased group.label) plus one ungrouped bucket
  const buckets = groupByKey({ items: matching, keyFn: ([, config]) => config.group?.label })
  const ctx = { breakpoint, appState, appConfig, evaluateProp }

  const result = []
  for (const [key, members] of buckets) {
    if (key === null) {
      result.push(...buildUngroupedItems(members, ctx))
    } else {
      result.push(buildGroupItem(key, members, ctx))
    }
  }

  return result
}

export {
  mapButtons,
  getMatchingButtons,
  applySlotExclusivity,
  SlotButton
}
