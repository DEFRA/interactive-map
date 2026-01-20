import { getQueryParam } from '../utils/queryString.js'
import { toggleInertElements } from '../utils/toggleInertElements.js'
import { isHybridFullscreen } from '../utils/getIsFullscreen.js'
import defaults from '../config/defaults.js'

// -----------------------------------------------------------------------------
// Internal (not exported)
// -----------------------------------------------------------------------------

function updatePageTitle ({ pageTitle, isFullscreen }) {
  const parts = document.title.split(': ')
  const title = parts[parts.length - 1]
  document.title = isFullscreen ? `${pageTitle}: ${title}` : title
}

function getIsFullscreen (config) {
  const { id, behaviour } = config
  const hasViewParam = getQueryParam(defaults.mapViewParamKey) === id

  return behaviour === 'mapOnly' ||
         (hasViewParam && (behaviour === 'buttonFirst' || isHybridFullscreen(config)))
}

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

/**
 * Update the DOM state based on configuration and fullscreen mode.
 *
 * Applies/removes classes, updates the page title, and sets container height.
 *
 * @param {Object} mapInstance - Map instance containing config and root element.
 * @param {Object} mapInstance.config - App configuration.
 * @param {string} mapInstance.config.pageTitle - Page title used in fullscreen mode.
 * @param {string} mapInstance.config.behaviour - Behaviour mode ("mapOnly", "buttonFirst", "hybrid").
 * @param {string|number} mapInstance.config.containerHeight - Height to use when not fullscreen.
 * @param {HTMLElement} mapInstance.rootEl - Root element of the app.
 * @returns {void}
 */
function updateDOMState (mapInstance) {
  const { config, rootEl } = mapInstance
  const { pageTitle, behaviour, containerHeight } = config
  const isFullscreen = getIsFullscreen(config)

  if (['mapOnly', 'buttonFirst', 'hybrid'].includes(behaviour)) {
    toggleInertElements({ containerEl: rootEl, isFullscreen })
    document.documentElement.classList.toggle('im-is-fullscreen', isFullscreen)
    rootEl.classList.toggle('im-is-fullscreen', isFullscreen)
  }

  if (['buttonFirst', 'hybrid'].includes(behaviour)) {
    updatePageTitle({ pageTitle, isFullscreen })
  }

  // Set container height
  const height = !isFullscreen &&
    (behaviour === 'buttonFirst' || isHybridFullscreen(config))
    ? 'auto'
    : containerHeight
  rootEl.style.height = isFullscreen ? '100%' : height
}

/**
 * Remove the global "loading" state from the page.
 *
 * Removes the `im-is-loading` class from the document body.
 *
 * @returns {void}
 */
function removeLoadingState () {
  document.body.classList.remove('im-is-loading')
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  updateDOMState,
  removeLoadingState
}
