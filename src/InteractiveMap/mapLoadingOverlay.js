// src/InteractiveMap/mapLoadingOverlay.js

const OVERLAY_CLASS = 'im-c-map-loading'
const FULLSCREEN_CLASS = 'im-c-map-loading--fullscreen'

// Fast loads finish inside this, so the spinner never flashes
const SHOW_DELAY = 200

function createOverlayElements (text) {
  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASS
  overlay.setAttribute('aria-hidden', 'true')

  const spinner = document.createElement('span')
  spinner.className = `${OVERLAY_CLASS}__spinner`

  const label = document.createElement('span')
  label.className = `${OVERLAY_CLASS}__text`
  label.textContent = text

  overlay.append(spinner, label)
  return { overlay, spinner }
}

/**
 * Create the loading overlay shown while the map app loads (`enableMapLoading`).
 *
 * The overlay starts inside the map container, before the app has loaded. The
 * app's first render clears the container, and the app then puts the same
 * element back into its own layout with `attachTo`, before the browser paints.
 *
 * The overlay is visual only. Screen readers hear the message as part of the
 * map viewport's label while the map is loading.
 *
 * Loading ends when `dismiss` is called, or after `timeout` so a map that never
 * finishes loading doesn't leave the app unusable.
 *
 * @param {Object} options
 * @param {string} options.text - Message shown under the spinner.
 * @param {number} options.timeout - Milliseconds after which loading ends anyway. `0` never ends it.
 * @returns {{ show: Function, attachTo: Function, dismiss: Function, isLoading: Function, hasTimedOut: Function, onDismiss: Function }}
 */
export function createLoadingOverlay ({ text, timeout }) {
  const { overlay, spinner } = createOverlayElements(text)

  let parentEl = null
  let shownAt = null
  let delayTimer = null
  let timeoutTimer = null
  let timedOut = false
  const dismissListeners = new Set()

  // Moving an element restarts its CSS animations, so start them part way
  // through to carry on from where they were
  function insert () {
    if (shownAt === null) {
      shownAt = Date.now()
    }
    const animationDelay = `-${Date.now() - shownAt}ms`
    overlay.style.animationDelay = animationDelay
    spinner.style.animationDelay = animationDelay
    parentEl.appendChild(overlay)
  }

  /**
   * Show the overlay in the map container after a short delay.
   *
   * @param {Object} options
   * @param {HTMLElement} options.container - The map container.
   * @param {boolean} options.isFullscreen - Whether the map opens fullscreen.
   */
  function show ({ container, isFullscreen }) {
    reset()
    timedOut = false
    parentEl = container
    overlay.classList.toggle(FULLSCREEN_CLASS, isFullscreen)

    delayTimer = setTimeout(() => {
      delayTimer = null
      insert()
    }, SHOW_DELAY)
    if (timeout > 0) {
      timeoutTimer = setTimeout(() => {
        timedOut = true
        dismiss()
      }, timeout)
    }
  }

  /**
   * Move the overlay into the app once it has mounted. The app sets its own
   * fullscreen position, so the overlay no longer needs one.
   *
   * @param {HTMLElement} appEl - The app's root element.
   */
  function attachTo (appEl) {
    if (!parentEl || !appEl) {
      return
    }
    parentEl = appEl
    overlay.classList.remove(FULLSCREEN_CLASS)
    if (shownAt !== null) {
      insert()
    }
  }

  function reset () {
    clearTimeout(delayTimer)
    clearTimeout(timeoutTimer)
    delayTimer = null
    timeoutTimer = null
    parentEl = null
    shownAt = null
    overlay.remove()
  }

  /**
   * End loading: remove the overlay, or stop it appearing if it is still
   * waiting to show.
   */
  function dismiss () {
    if (!isLoading()) {
      return
    }
    reset()
    dismissListeners.forEach(listener => listener())
  }

  /**
   * Whether the map is still loading, whether or not the overlay is showing yet.
   *
   * @returns {boolean}
   */
  function isLoading () {
    return parentEl !== null
  }

  /**
   * Whether loading last ended because the map took longer than `timeout`.
   *
   * @returns {boolean}
   */
  function hasTimedOut () {
    return timedOut
  }

  /**
   * Call a function when loading ends.
   *
   * @param {Function} listener
   * @returns {Function} Stops calling the listener.
   */
  function onDismiss (listener) {
    dismissListeners.add(listener)
    return () => dismissListeners.delete(listener)
  }

  return { show, attachTo, dismiss, isLoading, hasTimedOut, onDismiss }
}
