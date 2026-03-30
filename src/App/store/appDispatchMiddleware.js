// src/App/store/dispatchMiddleware.js
import { EVENTS as events } from '../../config/events.js'
import { defaultPanelConfig, defaultButtonConfig, defaultControlConfig } from '../../config/appConfig.js'
import { deepMerge } from '../../utils/deepMerge.js'
import { allowedSlots } from '../renderer/slots.js'
import { logger } from '../../services/logger.js'

const BREAKPOINTS = ['mobile', 'tablet', 'desktop']

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

  if (type === 'ADD_BUTTON') {
    const { id, config } = payload
    const mergedConfig = deepMerge(defaultButtonConfig, config)
    BREAKPOINTS.forEach(bp => {
      const slot = mergedConfig[bp]?.slot
      if (slot && !allowedSlots.button.includes(slot)) {
        logger.warn(`button "${id}" has invalid slot "${slot}" at breakpoint "${bp}". Allowed slots: ${allowedSlots.button.join(', ')}.`)
      }
    })
  }

  if (type === 'ADD_CONTROL') {
    const { id, config } = payload
    const mergedConfig = deepMerge(defaultControlConfig, config)
    BREAKPOINTS.forEach(bp => {
      const slot = mergedConfig[bp]?.slot
      if (slot && !allowedSlots.control.includes(slot)) {
        logger.warn(`control "${id}" has invalid slot "${slot}" at breakpoint "${bp}". Allowed slots: ${allowedSlots.control.join(', ')}.`)
      }
    })
  }

  if (type === 'ADD_PANEL') {
    const { id, config } = payload
    const mergedConfig = deepMerge(defaultPanelConfig, config)
    BREAKPOINTS.forEach(bp => {
      const slot = mergedConfig[bp]?.slot
      if (slot && !allowedSlots.panel.includes(slot) && !slot.endsWith('-button')) {
        logger.warn(`panel "${id}" has invalid slot "${slot}" at breakpoint "${bp}". Allowed slots: ${allowedSlots.panel.join(', ')}.`)
      }
    })
    const bpConfig = mergedConfig[previousState.breakpoint]
    if (bpConfig?.open) {
      queueMicrotask(() => {
        const slot = bpConfig.slot
        const { visibleGeometry } = mergedConfig
        const eventPayload = { panelId: id, slot }
        if (visibleGeometry) {
          eventPayload.visibleGeometry = visibleGeometry
        }
        eventBus.emit(events.APP_PANEL_OPENED, eventPayload)
      })
    }
  }
}
