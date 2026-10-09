// services/mapFocus.js

/**
 * Moves focus to the map viewport, optionally with a message that stands in
 * for the viewport's accessible name. Being the name, the message is spoken
 * reliably and straight away as part of the focus announcement, where a live
 * region update would race the focus change. The original name returns when
 * focus leaves the viewport, so the name never changes while it has focus.
 *
 * A message also holds back map state announcements ("New area
 * approximately...") until the user next presses a key or pointer on the map,
 * since it already describes the move that follows.
 */
const ARIA_LABEL = 'aria-label'

export function createMapFocus ({ viewportRef }) {
  let originalLabel = null
  let hasMessage = false
  let isHoldingAnnouncements = false

  const focus = ({ message } = {}) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    if (message) {
      if (!hasMessage) {
        originalLabel = viewport.getAttribute(ARIA_LABEL)
      }
      viewport.setAttribute(ARIA_LABEL, message)
      hasMessage = true
      isHoldingAnnouncements = true
    }
    viewport.focus()
  }

  const clear = () => {
    isHoldingAnnouncements = false
    if (!hasMessage) {
      return
    }
    hasMessage = false
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    if (originalLabel === null) {
      viewport.removeAttribute(ARIA_LABEL)
    } else {
      viewport.setAttribute(ARIA_LABEL, originalLabel)
    }
  }

  const releaseAnnouncements = () => {
    isHoldingAnnouncements = false
  }

  return {
    focus,
    clear,
    releaseAnnouncements,
    isHoldingAnnouncements: () => isHoldingAnnouncements
  }
}
