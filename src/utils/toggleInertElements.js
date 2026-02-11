/**
 * Checks whether a sibling element should be marked as inert.
 * @param {Element} sibling - The sibling element to evaluate
 * @param {Element} el - The current element being walked up from
 * @param {Element|null} containerEl - The container to preserve (not make inert)
 * @param {Element} boundaryEl - The outermost boundary for the traversal
 * @returns {boolean}
 */
const shouldMakeInert = (sibling, el, containerEl, boundaryEl) =>
  sibling !== el &&
  !containerEl?.contains(sibling) &&
  sibling.matches(':not([aria-hidden]):not([data-fm-inert])') &&
  boundaryEl.contains(sibling)

/**
 * Toggles inert state on elements outside a container for fullscreen/modal behaviour.
 *
 * When entering fullscreen, walks up from `containerEl` to `boundaryEl`, marking all
 * sibling branches as `aria-hidden` and flagging them with `data-fm-inert` so they
 * can be restored later. When exiting fullscreen, restores all previously inerted elements.
 *
 * @param {Object} options
 * @param {Element|null} options.containerEl - The element to keep interactive
 * @param {boolean} options.isFullscreen - Whether fullscreen mode is active
 * @param {Element} [options.boundaryEl=document.body] - The outermost ancestor to traverse up to
 */
export function toggleInertElements ({ containerEl, isFullscreen, boundaryEl = document.body }) {
  // Restore any previously inerted elements
  let inertElements = Array.from(boundaryEl.querySelectorAll('[data-fm-inert]'))

  if (containerEl) {
    inertElements = inertElements.filter(inertEl => !containerEl.contains(inertEl))
  }

  inertElements.forEach(inertEl => {
    inertEl.removeAttribute('aria-hidden')
    delete inertEl.dataset.fmInert
  })

  if (!isFullscreen) {
    return
  }

  // Entering fullscreen: blur active element and inert all sibling branches
  document.activeElement?.blur()

  let el = containerEl
  while (el?.parentNode && el !== boundaryEl && el !== document.body) {
    const parent = el.parentNode
    for (const sibling of parent.children) {
      if (shouldMakeInert(sibling, el, containerEl, boundaryEl)) {
        sibling.setAttribute('aria-hidden', 'true')
        sibling.dataset.fmInert = ''
      }
    }
    el = parent
  }
}
