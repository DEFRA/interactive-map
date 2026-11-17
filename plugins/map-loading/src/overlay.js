// src/plugins/map-loading/overlay.js

/**
 * DOM overlay shown while the map app loads.
 *
 * The component has no built-in loading message: `im-is-loading` only hides the
 * page body until the app mounts, and a plugin manifest can't help either - a
 * plugin's load() runs inside loadApp(), after the im-core and provider chunks
 * have downloaded, so nothing registered there can cover the chunk-download
 * phase. The `middle` slot is documented for loading screens but only exists
 * once the React app has mounted, and createRoot() discards anything already
 * inside the container at that point.
 *
 * This controller therefore manages the overlay itself, outside the app: the
 * map container is wrapped in a positioned div and the overlay appended as a
 * sibling, so it survives the React mount and covers the app from script
 * execution to tiles-idle. If the page server-rendered an overlay inside the
 * container (`adopt` selector) it is adopted - moved out of the container
 * before replaceChildren()/createRoot() would discard it.
 *
 * Dismissal triggers on `map:firstidle` (the first idle event, when every
 * source and tile has settled), when the component renders its `.im-c-error`
 * failure markup, on `map:destroy`, or via the returned `dismiss()`. Providers
 * do not forward native map `error` events, so a timeout dismisses anyway
 * rather than leaving the overlay over a map that will never reach idle.
 */

const WRAPPER_CLASS = 'im-c-map-loading-wrap'
const OVERLAY_CLASS = 'im-c-map-loading'
const FULLSCREEN_CLASS = 'im-c-map-loading--fullscreen'
const SPINNER_CLASS = 'im-c-map-loading__spinner'
const TEXT_CLASS = 'im-c-map-loading__text'

const DEFAULT_TEXT = 'Loading map'
// generous - a healthy map reaches firstidle well inside this on slow networks;
// it exists for the case where the style/tile fetch fails silently
const DEFAULT_TIMEOUT = 60000
const DEFAULT_ERROR_SELECTOR = '.im-c-error'
const DEFAULT_ADOPT_SELECTOR = `.${OVERLAY_CLASS}`

const inert = {
  show: () => {},
  dismiss: () => {},
  destroy: () => {},
  isShown: () => false
}

/**
 * Build the default overlay content: a decorative spinner plus the message.
 * `content` (a Node, string, or function returning either) replaces both.
 *
 * @param {Object} options
 * @returns {HTMLElement}
 */
function buildOverlay ({ text, spinner, content, role }) {
  const overlay = document.createElement('div')
  overlay.className = OVERLAY_CLASS
  overlay.setAttribute('role', role)

  const custom = typeof content === 'function' ? content(overlay) : content
  if (custom?.nodeType) {
    overlay.appendChild(custom)
    return overlay
  }

  if (spinner) {
    const el = document.createElement('span')
    el.className = SPINNER_CLASS
    el.setAttribute('aria-hidden', 'true')
    overlay.appendChild(el)
  }

  const label = document.createElement('span')
  label.className = TEXT_CLASS
  label.textContent = typeof custom === 'string' ? custom : text
  overlay.appendChild(label)

  return overlay
}

/**
 * Create the overlay controller for one map container.
 *
 * @param {Object} [options]
 * @param {HTMLElement|string} [options.container] - the map's container element or its id
 * @param {string} [options.text] - the message under the spinner
 * @param {boolean} [options.spinner] - include the spinner element (default content only)
 * @param {Node|string|function} [options.content] - custom overlay content, replacing the default spinner and text
 * @param {string} [options.className] - extra class names added to the overlay element
 * @param {string} [options.role] - the overlay's ARIA role (`status` announces politely)
 * @param {string|boolean} [options.adopt] - selector for a server-rendered overlay inside the
 *   container to adopt instead of building one; `false` disables adoption
 * @param {boolean} [options.fullscreen] - cover the viewport rather than the container,
 *   for `mapOnly` and launcher behaviours that open fullscreen
 * @param {boolean} [options.deferred] - stay hidden until the app starts loading (the open
 *   button is hidden), for `buttonFirst`/`hybrid` launchers; the overlay re-arms each time
 *   the app closes back to the launcher
 * @param {number} [options.timeout] - dismiss anyway after this long; 0 disables the safety net
 * @param {string|boolean} [options.errorSelector] - dismiss when this marker appears inside the
 *   container; falsy disables the error watch
 * @param {function} [options.onShow] - called when the overlay mounts
 * @param {function} [options.onDismiss] - called with the dismissal reason:
 *   'firstidle', 'error', 'timeout', 'destroy', 'appopened' or 'manual'
 * @returns {Object} controller with `show()`, `dismiss(reason)`, `destroy()` and `isShown()`
 */
export function createLoadingOverlay ({
  container,
  text = DEFAULT_TEXT,
  spinner = true,
  content,
  className,
  role = 'status',
  adopt = DEFAULT_ADOPT_SELECTOR,
  fullscreen = false,
  deferred = false,
  timeout = DEFAULT_TIMEOUT,
  errorSelector = DEFAULT_ERROR_SELECTOR,
  onShow,
  onDismiss
} = {}) {
  const el = typeof container === 'string' ? document.getElementById(container) : container
  if (!el) {
    return inert
  }

  const overlay = (adopt && el.querySelector(adopt)) || buildOverlay({ text, spinner, content, role })
  overlay.remove() // detach until shown - keeps it out of createRoot()'s way either way
  overlay.classList.add(OVERLAY_CLASS)
  className?.split(/\s+/).filter(Boolean).forEach(name => overlay.classList.add(name))
  if (fullscreen) {
    overlay.classList.add(FULLSCREEN_CLASS)
  }

  let shown = false
  let destroyed = false
  let timer
  let errorObserver
  let launcherObserver
  // deferred activation fires on the launcher transition visible -> hidden, so it
  // must have seen the launcher in its visible state before a hidden one counts
  let seenLauncher = false
  let launcherReady = false

  function hasError () {
    return Boolean(errorSelector) && Boolean(el.querySelector(errorSelector))
  }

  // The element the open button sits next to: the container, or its wrapper
  // once mount() has reparented the container inside it
  function anchor () {
    return el.parentElement?.classList.contains(WRAPPER_CLASS) ? el.parentElement : el
  }

  // Move the overlay next to the container, wrapping the container in a
  // positioned div first if needed. The sibling position is what keeps the
  // overlay alive when React mounts over the container.
  function mount () {
    const parent = el.parentElement
    if (!parent) {
      // a detached container can't be wrapped - the overlay sits inside it and
      // only covers the pre-mount phase, if it displays at all
      el.appendChild(overlay)
      return
    }

    if (!parent.classList.contains(WRAPPER_CLASS)) {
      const wrapper = document.createElement('div')
      wrapper.className = WRAPPER_CLASS
      parent.insertBefore(wrapper, el)
      wrapper.appendChild(el)
    }
    el.parentElement.appendChild(overlay)
  }

  function show () {
    if (shown || destroyed || hasError()) {
      return
    }
    shown = true
    mount()
    if (timeout > 0) {
      timer = setTimeout(() => dismiss('timeout'), timeout)
    }
    onShow?.()
  }

  function dismiss (reason = 'manual') {
    if (!shown) {
      return
    }
    shown = false
    clearTimeout(timer)
    timer = undefined
    overlay.remove()
    onDismiss?.(reason)
  }

  function destroy () {
    destroyed = true
    dismiss('destroy')
    errorObserver?.disconnect()
    launcherObserver?.disconnect()
  }

  // Watch for the component's own failure markup for the controller's whole
  // life - it can be rendered before activation, while covered, or between
  // open/close cycles
  if (errorSelector) {
    errorObserver = new MutationObserver(() => {
      if (hasError()) {
        dismiss('error')
      }
    })
    errorObserver.observe(el, { childList: true, subtree: true })
  }

  if (deferred) {
    // Watch for the open button being hidden or removed - the signal that the
    // app has started loading. The button is a sibling of the container (or its
    // wrapper once mounted), created by the map after this factory runs.
    const watchRoot = anchor().parentElement
    if (watchRoot) {
      const check = () => {
        const launcher = anchor().previousElementSibling
        if (launcher) {
          seenLauncher = true
          const hidden = launcher.style.display === 'none' || launcher.hidden
          if (hidden && launcherReady) {
            launcherReady = false
            show()
          } else if (!hidden) {
            launcherReady = true
          }
        } else if (seenLauncher) {
          // a launcher that existed and was removed: the app is opening over it
          show()
        }
      }
      launcherObserver = new MutationObserver(check)
      launcherObserver.observe(watchRoot, {
        attributes: true,
        attributeFilter: ['style', 'class', 'hidden'],
        childList: true,
        subtree: true
      })
      check()
    }
  } else {
    show()
  }

  return {
    show,
    dismiss,
    destroy,
    isShown: () => shown
  }
}
