import { getQueryParam } from '../utils/queryString.js'
import { isHybridFullscreen } from '../utils/getIsFullscreen.js'
import { updateDOMState } from './domStateManager.js'
import defaults from '../config/defaults.js'

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Determines whether a component should be loaded based on configuration
 * and the current breakpoint.
 *
 * @param {Object} config - Component configuration.
 * @param {string} config.id - The view/component ID.
 * @param {string} config.behaviour - The behaviour mode ("buttonFirst", "mapOnly", "inline", "hybrid").
 * @returns {boolean} True if the component should be loaded.
 */
function shouldLoadComponent (config) {
  const { id, behaviour } = config
  const hasViewParam = getQueryParam(defaults.mapViewParamKey) === id

  return ['mapOnly', 'inline'].includes(behaviour) ||
    (behaviour === 'hybrid' && !isHybridFullscreen(config)) ||
    hasViewParam
}

/**
 * Sets up component behaviour based on map configuration.
 *
 * For `"buttonFirst"`, subscribes to container breakpoint changes.
 * For `"hybrid"`, subscribes to media query changes based on hybridWidth.
 *
 * @param {Object} mapInstance - Map instance containing config and methods.
 * @param {Object} mapInstance.config - Configuration object.
 * @param {Object} mapInstance._breakpointDetector - Breakpoint detector instance.
 * @param {Function} mapInstance.loadApp - Function to load the component.
 * @param {Function} mapInstance.removeApp - Function to remove the component.
 * @returns {Function|null} Cleanup function for hybrid media query listener.
 */
function setupBehavior (mapInstance) {
  const { behaviour, hybridWidth, maxMobileWidth } = mapInstance.config

  if (behaviour === 'buttonFirst') {
    mapInstance._breakpointDetector.subscribe(() => {
      if (shouldLoadComponent(mapInstance.config)) {
        mapInstance.loadApp()
      } else {
        mapInstance.removeApp()
      }
    })
  }

  if (behaviour === 'hybrid') {
    const threshold = hybridWidth ?? maxMobileWidth
    const mq = window.matchMedia(`(max-width: ${threshold}px)`)

    const handleChange = () => {
      if (shouldLoadComponent(mapInstance.config)) {
        if (mapInstance._isHidden) {
          mapInstance.showApp()
        } else if (mapInstance._root == null) {
          mapInstance.loadApp()
        } else {
          // Map is showing - update DOM state for fullscreen/inline transition
          updateDOMState(mapInstance)
        }
      } else if (mapInstance._root) {
        mapInstance.hideApp()
      } else {
        // No action
      }
    }

    mq.addEventListener('change', handleChange)

    // Return cleanup function
    return () => mq.removeEventListener('change', handleChange)
  }

  return null
}

export {
  setupBehavior,
  shouldLoadComponent
}
