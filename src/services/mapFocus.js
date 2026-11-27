// services/mapFocus.js
import { getFocusOptions } from '../utils/getFocusOptions.js'

/**
 * Owns the map viewport's accessible name and moves focus to the viewport.
 *
 * The name is the viewport's label (`setLabel`), with an optional message
 * added when focus moves to the map (`focus({ message })`). Being part of the
 * name, the message is spoken reliably and straight away as part of the focus
 * announcement, where a live region update would race the focus change. The
 * message is removed when focus leaves the viewport, and the map's own label
 * stays in the name throughout, so each map on a page stays identifiable.
 *
 * A message also holds back map state announcements ("New area
 * approximately...") until the user next presses a key or pointer on the map,
 * since it already describes the move that follows.
 */
const ARIA_LABEL = 'aria-label'

export function createMapFocus ({ viewportRef, getInterfaceType = () => undefined }) {
  let label = null
  let message = null
  let isHoldingAnnouncements = false

  // The only place the viewport's name is written
  const applyName = () => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    const name = [label, message].filter(Boolean).join('. ')
    if (name) {
      viewport.setAttribute(ARIA_LABEL, name)
    } else {
      viewport.removeAttribute(ARIA_LABEL)
    }
  }

  const setLabel = (newLabel) => {
    label = newLabel
    applyName()
  }

  const focus = ({ message: newMessage } = {}) => {
    const viewport = viewportRef.current
    if (!viewport) {
      return
    }
    if (newMessage) {
      message = newMessage
      isHoldingAnnouncements = true
      applyName()
    }
    viewport.focus(getFocusOptions(getInterfaceType()))
  }

  const clear = () => {
    isHoldingAnnouncements = false
    if (message === null) {
      return
    }
    message = null
    applyName()
  }

  const releaseAnnouncements = () => {
    isHoldingAnnouncements = false
  }

  return {
    focus,
    clear,
    setLabel,
    releaseAnnouncements,
    isHoldingAnnouncements: () => isHoldingAnnouncements
  }
}
