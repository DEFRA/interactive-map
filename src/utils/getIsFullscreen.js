/**
 * Checks if hybrid behaviour should show fullscreen (buttonFirst) mode.
 * Uses media query width (not container width) to determine this.
 *
 * @param {Object} config - Component configuration.
 * @param {string} config.behaviour - The behaviour mode.
 * @param {number} config.hybridWidth - Custom threshold for hybrid switch (optional).
 * @param {number} config.maxMobileWidth - Fallback threshold if hybridWidth not set.
 * @returns {boolean} True if hybrid should be fullscreen.
 */
export const isHybridFullscreen = (config) => {
  const { behaviour, hybridWidth, maxMobileWidth } = config
  if (behaviour !== 'hybrid') {
    return false
  }
  const threshold = hybridWidth ?? maxMobileWidth
  return window.matchMedia(`(max-width: ${threshold}px)`).matches
}

/**
 * Determines if the app should be in fullscreen mode.
 *
 * @param {Object} config - Component configuration.
 * @param {string} config.behaviour - The behaviour mode.
 * @param {number} [config.hybridWidth] - Custom threshold for hybrid switch.
 * @param {number} [config.maxMobileWidth] - Fallback threshold if hybridWidth not set.
 * @returns {boolean} True if fullscreen mode should be active.
 */
export const getIsFullscreen = (config) => {
  const { behaviour } = config
  return ['mapOnly', 'buttonFirst'].includes(behaviour) || isHybridFullscreen(config)
}
