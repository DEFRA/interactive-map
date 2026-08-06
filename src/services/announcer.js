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
export function createAnnouncer (mapStatusRef, { startupGraceDelay = 1000 } = {}) {
  const CLEAR_DELAY = 100
  const DEBOUNCE_DELAY = 500
  // How long an action result keeps priority over ambient messages. Covers the
  // debounce + clear write (600ms) plus a short buffer so a hint firing right
  // after a user action can't stomp the action's message before it is read.
  const ACTION_HOLD_DELAY = 1000
  // Invisible, unpronounced marker appended to alternate repeats of the same
  // message. Some screen readers (VoiceOver in particular) de-dupe against the
  // last utterance they spoke for a live region, not just the DOM's final
  // state — so a genuine ''-then-text mutation can still be silently skipped
  // if the text matches what was already read. Toggling this marker in keeps
  // consecutive identical announcements from ever being byte-identical.
  const REPEAT_MARKER = '\u200B'
  // A screen reader may still be building its accessibility tree for a
  // newly-loaded page — the live region's DOM node can exist and mutate
  // correctly while the AT hasn't registered it yet, so an announcement fired
  // this soon after boot (e.g. a consumer calling showHint() on 'app:ready')
  // can be silently missed even though nothing here did anything wrong. Give
  // any announcement inside this window from creation an extra head start;
  // announcements after it behave exactly as before, with zero extra delay.
  // Configurable (default 1000ms) so tests can set it to 0 and not have to
  // account for it in every unrelated timing assertion.
  const STARTUP_GRACE_DELAY = startupGraceDelay
  const startedAt = Date.now()

  let actionHoldTimer = null
  let lastAnnouncedMsg = null
  let repeatMarkerOn = false

  // Core function to write to the live region
  const setLiveRegion = (msg) => {
    if (!mapStatusRef?.current || !msg) {
      return
    }

    const startupDelay = Math.max(0, STARTUP_GRACE_DELAY - (Date.now() - startedAt))

    // Clear first (for SR to re-announce)
    mapStatusRef.current.textContent = ''
    setTimeout(() => {
      if (!mapStatusRef.current) {
        return
      }
      repeatMarkerOn = msg === lastAnnouncedMsg ? !repeatMarkerOn : false
      lastAnnouncedMsg = msg
      mapStatusRef.current.textContent = repeatMarkerOn ? msg + REPEAT_MARKER : msg
    }, CLEAR_DELAY + startupDelay)
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

  // Blanks the live region without announcing anything. Used when a message is
  // dismissed (e.g. a hint toast auto-dismissing) so a later identical message
  // starts from a genuinely empty region — otherwise clear-then-set-same-text
  // nets out to no change and some screen readers skip the re-announcement.
  announce.clear = () => {
    if (!mapStatusRef?.current) {
      return
    }
    mapStatusRef.current.textContent = ''
  }

  return announce
}
