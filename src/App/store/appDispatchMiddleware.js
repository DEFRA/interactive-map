// src/App/store/dispatchMiddleware.js
import { EVENTS as events } from '../../config/events.js'

/**
 * Determines which panels were implicitly closed when opening a new panel
 */
function getClosedPanelIds (panelId, previousOpenPanels, breakpoint, panelConfig) {
  const bpConfig = panelConfig[panelId]?.[breakpoint]
  const isExclusiveNonModal = !!bpConfig?.exclusive && !bpConfig?.modal
  const isModal = !!bpConfig?.modal
  const closedPanelIds = []

  if (isModal) {
    // Modals don't close other panels
    return closedPanelIds
  }

  const previousPanelIds = Object.keys(previousOpenPanels)

  if (isExclusiveNonModal) {
    // Exclusive non-modal closes all non-exclusive panels
    previousPanelIds.forEach(prevPanelId => {
      const prevBpConfig = panelConfig[prevPanelId]?.[breakpoint]
      if (!prevBpConfig?.exclusive) {
        closedPanelIds.push(prevPanelId)
      }
    })
  } else {
    // Non-modal closes all exclusive non-modal panels
    previousPanelIds.forEach(prevPanelId => {
      const prevBpConfig = panelConfig[prevPanelId]?.[breakpoint]
      if (prevBpConfig?.exclusive && !prevBpConfig?.modal) {
        closedPanelIds.push(prevPanelId)
      }
    })
  }

  return closedPanelIds
}

/**
 * Handles side effects for actions
 */
export function handleActionSideEffects (action, previousState, panelConfig, eventBus) {
  const { type, payload } = action

  if (type === 'CLOSE_PANEL') {
    queueMicrotask(() => {
      eventBus.emit(events.APP_PANEL_CLOSED, { panelId: payload })
    })
  }

  if (type === 'CLOSE_ALL_PANELS') {
    queueMicrotask(() => {
      const panelIds = Object.keys(previousState.openPanels)
      panelIds.forEach(panelId => {
        eventBus.emit(events.APP_PANEL_CLOSED, { panelId })
      })
    })
  }

  if (type === 'OPEN_PANEL') {
    const { panelId, props } = payload
    const closedPanelIds = getClosedPanelIds(
      panelId,
      previousState.openPanels,
      previousState.breakpoint,
      panelConfig
    )

    queueMicrotask(() => {
      // Emit close events for implicitly closed panels
      closedPanelIds.forEach(closedPanelId => {
        eventBus.emit(events.APP_PANEL_CLOSED, { panelId: closedPanelId })
      })

      // Emit open event for the new panel
      eventBus.emit(events.APP_PANEL_OPENED, { panelId, props })
    })
  }
}
