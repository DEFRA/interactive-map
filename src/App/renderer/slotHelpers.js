// src/App/renderer/slotHelpers.js
import { allowedSlots } from './slots.js'

/**
 * Resolves the target slot for a panel based on its breakpoint config.
 * Modal panels always render in the 'modal' slot, and the bottom slot
 * is only available on mobile — tablet and desktop fall back to 'inset'.
 */
export const resolveTargetSlot = (bpConfig, breakpoint) => {
  if (bpConfig.modal) {
    return 'modal'
  }
  if (bpConfig.slot === 'bottom' && ['tablet', 'desktop'].includes(breakpoint)) {
    return 'inset'
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
  if (!allowedSlots.control.includes(bpConfig.slot)) {
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
