// src/core/renderers/mapButtons.js
import { MapButton } from '../components/MapButton/MapButton.jsx'
import { allowedSlots } from './slots.js'

function getMatchingButtons ({ appState, buttonConfig, slot, evaluateProp }) {
  const { breakpoint, mode } = appState
  if (!buttonConfig) {
    return []
  }

  return Object.entries(buttonConfig).filter(([_, config]) => {
    const bpConfig = config[breakpoint]

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

function renderButton ({ btn, appState, appConfig, evaluateProp, groupStart, groupMiddle, groupEnd }) {
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
      showLabel={bpConfig.showLabel}
      isDisabled={appState.disabledButtons.has(buttonId)}
      isHidden={appState.hiddenButtons.has(buttonId)}
      isPressed={(config.isPressed !== undefined || config.pressedWhen) ? appState.pressedButtons.has(buttonId) : undefined}
      isExpanded={(config.isExpanded !== undefined || config.expandedWhen) ? appState.expandedButtons.has(buttonId) : undefined}
      isPanelOpen={isPanelOpen}
      onClick={handleClick}
      panelId={config.panelId}
      menuItems={config.menuItems}
      idPrefix={appConfig.id}
      groupStart={groupStart}
      groupMiddle={groupMiddle}
      groupEnd={groupEnd}
    />
  )
}

function mapButtons ({ slot, appState, appConfig, evaluateProp }) {
  const { buttonConfig, breakpoint } = appState

  const matching = getMatchingButtons({ appState, appConfig, buttonConfig, slot, evaluateProp })

  if (!matching.length) {
    return []
  }

  const groupMap = new Map()
  matching.forEach(([, config], idx) => {
    const key = config.group
    if (key == null) {
      return
    }
    if (!groupMap.has(key)) {
      groupMap.set(key, [])
    }
    groupMap.get(key).push(idx)
  })

  for (const [key, indices] of groupMap) {
    if (indices.length < 2) {
      groupMap.delete(key)
    }
  }

  return matching.map((btn, idx) => {
    const [buttonId, config] = btn
    const key = config.group
    const indices = key == null ? null : groupMap.get(key)
    const groupStart = indices ? idx === indices[0] : false
    const groupEnd = indices ? idx === indices[indices.length - 1] : false
    const groupMiddle = indices && indices.length >= 3 && !groupStart && !groupEnd // NOSONAR: 3 = minimum for a start/middle/end group
    const order = config[breakpoint]?.order ?? 0

    return {
      id: buttonId,
      type: 'button',
      order,
      element: renderButton({ btn, appState, appConfig, evaluateProp, groupStart, groupMiddle, groupEnd })
    }
  })
}

export {
  mapButtons,
  getMatchingButtons,
  renderButton
}
