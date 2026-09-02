// src/App/renderer/slotHelpers.js
import { allowedSlots } from './slots.js'

/**
 * Resolves the target slot for a panel based on its breakpoint config.
 * Modal panels always render in the 'modal' slot, and the drawer slot
 * is only available on mobile — tablet and desktop fall back to 'left-top'.
 */
export const resolveTargetSlot = (bpConfig, breakpoint) => {
  if (bpConfig.modal) {
    return 'modal'
  }
  if (bpConfig.slot === 'drawer' && ['tablet', 'desktop'].includes(breakpoint)) {
    return 'left-top'
  }
  return bpConfig.slot
}

/**
 * Checks whether the current application mode permits an item to be shown,
 * based on its includeModes and excludModes configuration.
 */
export const isModeAllowed = (config, mode) => {
  if (config.includeModes && !config.includeModes.includes(mode)) {
    return false
  }
  if (config.excludeModes?.includes(mode)) {
    return false
  }
  return true
}

/**
 * Checks whether a control should be visible based on breakpoint,
 * mode, fullscreen, and slot constraints.
 */
export const isControlVisible = (control, { breakpoint, mode, isFullscreen }) => {
  const bpConfig = control[breakpoint]
  if (!bpConfig) {
    return false
  }
  // A control may also target a panel's body directly via the `<panelId>-panel`
  // slot convention (mirrors the `<buttonId>-button` convention panels already use).
  if (!allowedSlots.control.includes(bpConfig.slot) && !bpConfig.slot?.endsWith('-panel')) {
    return false
  }
  if (!isModeAllowed(control, mode)) {
    return false
  }
  if (control.inline === false && !isFullscreen) {
    return false
  }
  return true
}

/**
 * Returns true if a panel/control was added via the consumer API with static HTML
 * (i.e. not a plugin component).
 */
export const isConsumerHtml = (config) => {
  return typeof config.html === 'string' && !config.pluginId
}

/**
 * Whether a panel is eligible for a target slot (slot type, mode, inline/fullscreen) —
 * independent of open state and modal exclusivity (see getAllowedModalPanelId). `slot`, if
 * given, also requires an exact match to the panel's resolved targetSlot.
 */
export const isPanelSlotEligible = (config, { targetSlot, slot, mode, isFullscreen }) => {
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
  if (slot !== undefined && targetSlot !== slot) {
    return false
  }
  return true
}

// The id of the most-recently-opened modal panel — the only one actually allowed to show.
export const getAllowedModalPanelId = (openPanels, panelConfig, breakpoint) => {
  const openModalPanelIds = Object.keys(openPanels).filter(panelId => panelConfig[panelId]?.[breakpoint]?.modal)
  return openModalPanelIds.length > 0 ? openModalPanelIds[openModalPanelIds.length - 1] : null // NOSONAR, .at() is only Chrome 90+
}

// Whether any modal-configured panel is open — drives the modal backdrop's visibility.
export const hasOpenModalPanel = (openPanels, panelConfig, breakpoint) => {
  return getAllowedModalPanelId(openPanels, panelConfig, breakpoint) !== null
}
