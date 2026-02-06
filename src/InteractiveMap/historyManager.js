import { getQueryParam } from '../utils/queryString.js'
import { isHybridFullscreen } from '../utils/getIsFullscreen.js'
import defaults from '../config/defaults.js'

// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

/**
 * Handles the `popstate` event triggered by browser back/forward navigation.
 *
 * - Determines which component should be open based on the `view` query parameter in the URL.
 * - Opens the component if it should be visible but is not currently rendered.
 * - Closes components that should not be visible in the current breakpoint or view.
 * - Preserves hybrid component visibility logic based on the current breakpoint.
 *
 * Note: The `isBack` flag in history.state is not used for navigation logic; it is used solely
 *       for back button UI rendering.
 *
 * @private
 * @returns {void}
 */
function handlePopstate () {
  const viewId = getQueryParam(defaults.mapViewParamKey)

  for (const mapInstance of components.values()) {
    const shouldBeOpen = mapInstance.id === viewId
    const isHybridVisible = mapInstance.config.behaviour === 'hybrid' && !isHybridFullscreen(mapInstance.config)
    const isOpen = mapInstance.rootEl?.children.length

    if (shouldBeOpen && (!isOpen || mapInstance._isHidden)) {
      if (mapInstance._isHidden) {
        mapInstance.showApp?.()
      } else {
        mapInstance.loadApp?.()
      }
    } else if (!shouldBeOpen && isOpen && !isHybridVisible) {
      if (mapInstance.config.preserveStateOnClose) {
        mapInstance.hideApp?.()
      } else {
        mapInstance.removeApp?.()
      }
    } else {
      // No action
    }
  }
}

// -----------------------------------------------------------------------------
// Internal state
// -----------------------------------------------------------------------------

/** Map of registered components by ID. */
const components = new Map()

/** Tracks whether the popstate listener has been initialized. */
let initialized = false

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

/**
 * Registers a component for handling history popstate events.
 *
 * If this is the first component registered, sets up a listener for
 * `window.popstate` to handle back/forward navigation.
 *
 * @param {Object} component - Component to register.
 * @param {string} component.id - Unique ID for the component.
 * @param {Function} [component.loadApp] - Optional function to load the component.
 * @param {Function} [component.removeApp] - Optional function to remove the component.
 * @param {HTMLElement} [component.rootEl] - Root element of the component.
 * @param {HTMLElement} [component.openButton] - Button to focus when removing component.
 * @param {Object} component.config - Component configuration.
 * @param {string} component.config.behaviour - Behaviour mode ("hybrid", etc.).
 * @returns {void}
 */
function register (component) {
  if (!initialized) {
    window.addEventListener('popstate', handlePopstate)
    initialized = true
  }

  components.set(component.id, component)
}

/**
 * Unregisters a previously registered component.
 *
 * @param {Object} component - Component to unregister.
 * @param {string} component.id - Unique ID of the component.
 * @returns {void}
 */
function unregister (component) {
  components.delete(component.id)
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export default {
  register,
  unregister
}
