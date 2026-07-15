// services/announcer.js
import { debounce } from '../utils/debounce.js'

/**
 * Live-region announcer for screen readers.
 *
 * Priority model — the axis that matters is "did the user ask for this?", not
 * which part of the code sent it:
 *
 *  - 'action'  Direct response to a deliberate user keypress (pan/zoom result,
 *              Alt+I reverse-geocode, a plugin shortcut result, search results).
 *              The latest action always wins: rapid actions are debounced down
 *              to the most recent, and an action is never blocked by an ambient
 *              message. This is the default.
 *
 *  - 'ambient' Passive/system-initiated message the user did not directly ask
 *              for (e.g. the "Press Shift+? for keyboard controls" hint shown on
 *              focus). Ambient messages yield: they are skipped while a recent
 *              action result is holding priority so they can never clobber what
 *              the user actually requested.
 */
export function createAnnouncer (mapStatusRef) {
  const CLEAR_DELAY = 100
  const DEBOUNCE_DELAY = 500
  // How long an action result keeps priority over ambient messages. Covers the
  // debounce + clear write (600ms) plus a short buffer so a hint firing right
  // after a user action can't stomp the action's message before it is read.
  const ACTION_HOLD_DELAY = 1000

  let actionHoldTimer = null

  // Core function to write to the live region
  const setLiveRegion = (msg) => {
    if (!mapStatusRef?.current || !msg) {
      return
    }

    // Clear first (for SR to re-announce)
    mapStatusRef.current.textContent = ''
    setTimeout(() => {
      if (!mapStatusRef.current) {
        return
      }
      mapStatusRef.current.textContent = msg
    }, CLEAR_DELAY)
  }

  // Debounced announcer to group rapid action events down to the latest one
  const debouncedAnnounce = debounce(setLiveRegion, DEBOUNCE_DELAY)

  // Hold (or refresh) action priority so ambient messages yield for a window
  const holdActionPriority = () => {
    clearTimeout(actionHoldTimer)
    actionHoldTimer = setTimeout(() => {
      actionHoldTimer = null
    }, ACTION_HOLD_DELAY)
  }

  // Public announce function
  const announce = (msg, kind = 'action') => {
    if (!msg) {
      return
    }

    if (kind === 'ambient') {
      // Yield to a recent user-action result rather than clobber it
      if (actionHoldTimer) {
        return
      }
      setLiveRegion(msg)
      return
    }

    // Action: latest deliberate user action wins and is always read
    holdActionPriority()
    debouncedAnnounce(msg)
  }

  return announce
}
