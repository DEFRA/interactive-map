import { getQueryParam } from '../utils/queryString.js'
import { toggleInertElements } from '../utils/toggleInertElements.js'
import { isHybridFullscreen } from '../utils/getIsFullscreen.js'

// -----------------------------------------------------------------------------
// Internal (not exported)
// -----------------------------------------------------------------------------

function updatePageTitle ({ pageTitle, isFullscreen }) {
  const parts = document.title.split(': ')
  const title = parts[parts.length - 1]
  document.title = isFullscreen ? `${pageTitle}: ${title}` : title
}

function getIsFullscreen (config) {
  const { id, behaviour, manageHistoryState } = config

  if (behaviour === 'mapOnly') {
    return true
  }

  if (behaviour === 'buttonFirst') {
    // When the SPA manages history, the app is always fullscreen when loaded
    if (manageHistoryState === false) {
      return true
    }
    return getQueryParam(config.mapViewQueryParam) === id
  }

  return isHybridFullscreen(config) && getQueryParam(config.mapViewQueryParam) === id
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
 * @param {Object} [options]
 * @param {boolean} [options.isFullscreen] - Override the computed fullscreen state.
 * @returns {void}
 */
function updateDOMState (mapInstance, { isFullscreen: isFullscreenOverride } = {}) {
  const { config, rootEl } = mapInstance
  const { pageTitle, behaviour, containerHeight } = config
  const isFullscreen = isFullscreenOverride ?? getIsFullscreen(config)

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

  return { isFullscreen }
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

/**
 * Show the page straight away when the map will render inline.
 *
 * Reserves the map container's height and removes the loading state, so the
 * page's own content can render while the map app loads. When the map will
 * open fullscreen, the loading state stays until the app has rendered, so the
 * page doesn't show through before the map covers it.
 *
 * @param {Object} mapInstance - Map instance containing config and root element.
 * @returns {void}
 */
function showPageIfMapInline (mapInstance) {
  if (getIsFullscreen(mapInstance.config)) {
    return
  }
  updateDOMState(mapInstance, { isFullscreen: false })
  removeLoadingState()
}

// -----------------------------------------------------------------------------
// Exports
// -----------------------------------------------------------------------------

export {
  updateDOMState,
  removeLoadingState,
  showPageIfMapInline
}
