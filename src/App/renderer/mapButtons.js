// src/core/renderers/mapButtons.js
import { MapButton } from '../components/MapButton/MapButton.jsx'
import { allowedSlots } from './slots.js'

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

    // Skip panel-toggle buttons when the panel is non-dismissable (always visible) at this breakpoint
    if (config.panelId) {
      const panelBpConfig = appState.panelConfig?.[config.panelId]?.[breakpoint]
      if (panelBpConfig?.open === true && panelBpConfig?.dismissable === false) {
        return false
      }
    }

    if (bpConfig?.slot !== slot || !allowedSlots.button.includes(bpConfig.slot)) {
      return false
    }

    return true
  })
}

function createButtonClickHandler (btn, appState, evaluateProp) {
  const [, config] = btn
  const isPanelOpen = !!(config.panelId && appState.openPanels[config.panelId])

  return (e) => {
    if (typeof config.onClick === 'function') {
      config.onClick(e, evaluateProp(ctx => ctx, config.pluginId))
      return
    }

    if (config.panelId) {
      const triggeringElement = e.currentTarget
      appState.dispatch({
        type: isPanelOpen ? 'CLOSE_PANEL' : 'OPEN_PANEL',
        payload: isPanelOpen
          ? config.panelId
          : { panelId: config.panelId, props: { triggeringElement } }
      })
    }
  }
}

/**
 * Resolves the group name from a button config's group property.
 * Accepts either the new object form `{ name, label?, order? }` or a deprecated plain string.
 * @param {string|{name: string, label?: string, order?: number}|null|undefined} group
 * @returns {string|null}
 */
function resolveGroupName (group) {
  if (group == null) {
    return null
  }
  return typeof group === 'string' ? group : (group.name ?? null)
}

/**
 * Resolves the accessible label for a group.
 * Uses `label` if provided, otherwise falls back to `name`.
 * @param {string|{name: string, label?: string, order?: number}|null|undefined} group
 * @returns {string}
 */
function resolveGroupLabel (group) {
  if (!group) {
    return ''
  }
  if (typeof group === 'string') {
    return group
  }
  return group.label ?? group.name ?? ''
}

/**
 * Resolves the slot-level order for a group.
 * @param {string|{name: string, label?: string, order?: number}|null|undefined} group
 * @returns {number}
 */
function resolveGroupOrder (group) {
  if (!group || typeof group === 'string') {
    return 0
  }
  return group.order ?? 0
}

function renderButton ({ btn, appState, appConfig, evaluateProp }) {
  const [buttonId, config] = btn
  const bpConfig = config[appState.breakpoint] ?? {}
  const handleClick = createButtonClickHandler(btn, appState, evaluateProp)
  const isPanelOpen = !!(config.panelId && appState.openPanels[config.panelId])

  return (
    <MapButton
      key={buttonId}
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
    />
  )
}

function mapButtons ({ slot, appState, appConfig, evaluateProp }) {
  const { buttonConfig, breakpoint } = appState

  const matching = getMatchingButtons({ appState, appConfig, buttonConfig, slot, evaluateProp })

  if (!matching.length) {
    return []
  }

  // Partition matching buttons into named groups and ungrouped singletons
  const groupMap = new Map() // name -> { label, order, members: [[buttonId, config]] }
  const singletons = []

  matching.forEach(([buttonId, config]) => {
    const { group } = config

    if (group == null) {
      singletons.push([buttonId, config])
      return
    }

    /* istanbul ignore next */
    if (process.env.NODE_ENV !== 'production' && typeof group === 'string') {
      console.warn(`[interactive-map] Button "${buttonId}": group should be an object { name, label?, order? } — string groups are deprecated.`)
    }

    const name = resolveGroupName(group)
    const label = resolveGroupLabel(group)
    const order = resolveGroupOrder(group)

    if (groupMap.has(name)) {
      const existing = groupMap.get(name)
      /* istanbul ignore next */
      if (process.env.NODE_ENV !== 'production' && existing.order !== order) {
        console.warn(`[interactive-map] Group "${name}" has inconsistent order values (${existing.order} vs ${order}). Using the lower value.`)
        existing.order = Math.min(existing.order, order)
      }
    } else {
      groupMap.set(name, { label, order, members: [] })
    }

    groupMap.get(name).members.push([buttonId, config])
  })

  const result = []

  // Ungrouped buttons — order is the breakpoint-level slot position
  for (const btn of singletons) {
    const [buttonId, config] = btn
    const order = config[breakpoint]?.order ?? 0
    result.push({
      id: buttonId,
      type: 'button',
      order,
      element: renderButton({ btn, appState, appConfig, evaluateProp })
    })
  }

  for (const [groupName, { label, order: groupOrder, members }] of groupMap) {
    if (members.length < 2) {
      // Singleton group: degrade to a regular button using the group's slot order
      const btn = members[0]
      const [buttonId, config] = btn
      const order = groupOrder || config[breakpoint]?.order || 0
      result.push({
        id: buttonId,
        type: 'button',
        order,
        element: renderButton({ btn, appState, appConfig, evaluateProp })
      })
      continue
    }

    // Sort group members by their intra-group order (breakpoint-level order prop)
    const sorted = [...members].sort((a, b) => {
      const orderA = a[1][breakpoint]?.order ?? 0
      const orderB = b[1][breakpoint]?.order ?? 0
      return orderA - orderB
    })

    result.push({
      id: `group-${groupName}`,
      type: 'group',
      order: groupOrder,
      element: (
        <div key={`group-${groupName}`} role='group' aria-label={label} className='im-c-button-group'>{/* NOSONAR - div with role="group" is correct for a button group */}
          {sorted.map(btn => renderButton({ btn, appState, appConfig, evaluateProp }))}
        </div>
      )
    })
  }

  return result
}

export {
  mapButtons,
  getMatchingButtons,
  renderButton,
  resolveGroupName,
  resolveGroupLabel,
  resolveGroupOrder
}
