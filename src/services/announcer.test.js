import { createAnnouncer } from './announcer.js'

jest.useFakeTimers()

describe('createAnnouncer', () => {
  let mapStatusRef
  let announce

  beforeEach(() => {
    mapStatusRef = { current: { textContent: '' } }
    // startupGraceDelay: 0 — these tests exercise everything except the startup
    // grace window itself, which has its own dedicated describe block below.
    announce = createAnnouncer(mapStatusRef, { startupGraceDelay: 0 })
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('does nothing if msg is falsy', () => {
    announce(null)
    expect(mapStatusRef.current.textContent).toBe('')
    announce(undefined, 'action')
    expect(mapStatusRef.current.textContent).toBe('')
    announce('', 'ambient')
    expect(mapStatusRef.current.textContent).toBe('')
  })

  it('does nothing if mapStatusRef.current is null', () => {
    const announceWithNull = createAnnouncer({ current: null })
    expect(() => {
      announceWithNull('Hello')
      jest.advanceTimersByTime(1000)
    }).not.toThrow()
  })

  it('returns early if mapStatusRef.current becomes null during setTimeout', () => {
    announce('Test message', 'ambient')
    expect(mapStatusRef.current.textContent).toBe('') // cleared immediately

    mapStatusRef.current = null

    expect(() => jest.advanceTimersByTime(100)).not.toThrow()
  })

  it('sets textContent for an ambient message immediately (after clear)', () => {
    announce('Hint message', 'ambient')
    expect(mapStatusRef.current.textContent).toBe('') // cleared immediately
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Hint message')
  })

  it('sets textContent for an action message after debounce + clear', () => {
    announce('Action message', 'action')
    expect(mapStatusRef.current.textContent).toBe('')

    // advance only CLEAR_DELAY: still empty, debounce has not fired yet
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('')

    // advance DEBOUNCE_DELAY to trigger the actual announcement
    jest.advanceTimersByTime(500)
    expect(mapStatusRef.current.textContent).toBe('Action message')
  })

  it('defaults to an action message when no kind is given', () => {
    announce('Default message')
    jest.advanceTimersByTime(100)
    // action is debounced, so nothing yet
    expect(mapStatusRef.current.textContent).toBe('')
    jest.advanceTimersByTime(500)
    expect(mapStatusRef.current.textContent).toBe('Default message')
  })

  it('lets an action always announce even after an ambient message (first-time fix)', () => {
    // ambient hint shown first (e.g. keyboard-controls hint on focus)
    announce('Keyboard hint', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Keyboard hint')

    // user action must not be blocked by the earlier ambient message
    announce('Reverse geocode result', 'action')
    jest.advanceTimersByTime(600) // debounce + clear
    expect(mapStatusRef.current.textContent).toBe('Reverse geocode result')
  })

  it('gives a recent action priority: an ambient message is skipped', () => {
    announce('Map moved', 'action')
    jest.advanceTimersByTime(600) // debounce + clear
    expect(mapStatusRef.current.textContent).toBe('Map moved')

    // ambient arrives within the action hold window and must be ignored
    announce('Keyboard hint', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Map moved')
  })

  it('lets an ambient message through once the action hold window expires', () => {
    announce('Map moved', 'action')
    jest.advanceTimersByTime(600)
    expect(mapStatusRef.current.textContent).toBe('Map moved')

    // wait out the full ACTION_HOLD_DELAY (1000ms from the action call)
    jest.advanceTimersByTime(400)

    announce('Keyboard hint', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Keyboard hint')
  })

  it('exposes a clear() that blanks the live region without announcing', () => {
    announce('Hint message', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Hint message')

    announce.clear()
    expect(mapStatusRef.current.textContent).toBe('')
  })

  it('clear() is a no-op when mapStatusRef.current is null', () => {
    const announceWithNull = createAnnouncer({ current: null })
    expect(() => announceWithNull.clear()).not.toThrow()
  })

  it('a repeated identical ambient message re-announces after clear() blanks stale text', () => {
    // First announcement: region starts empty, so clear-then-set is a real transition.
    announce('Same message', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Same message')

    // Something (e.g. a hint dismissing) blanks the region before the retry, the way
    // hints.dismiss() now does — without this, clear-then-set-same-text nets to no
    // visible change and some screen readers skip the re-announcement.
    announce.clear()
    expect(mapStatusRef.current.textContent).toBe('')

    announce('Same message', 'ambient')
    jest.advanceTimersByTime(100)
    // Repeat marker kicks in because this is a repeat of the last *spoken* message,
    // regardless of the clear() in between — see the dedicated marker tests below.
    expect(mapStatusRef.current.textContent).toBe('Same message' + '\u200B')
  })

  it('alternates an invisible marker on consecutive identical messages so the text is never byte-identical twice in a row', () => {
    // VoiceOver has been observed to de-dupe against the last utterance it spoke for a
    // live region, not just the DOM's final state — so a real ''-then-text mutation can
    // still be silently skipped if the text matches what it already read out. Repeats
    // must therefore differ at the string level even though they sound identical.
    announce('Same message', 'ambient')
    jest.advanceTimersByTime(100)
    const first = mapStatusRef.current.textContent
    expect(first).toBe('Same message')

    announce('Same message', 'ambient')
    jest.advanceTimersByTime(100)
    const second = mapStatusRef.current.textContent
    expect(second).not.toBe(first)
    expect(second).toBe('Same message' + '\u200B')

    announce('Same message', 'ambient')
    jest.advanceTimersByTime(100)
    const third = mapStatusRef.current.textContent
    expect(third).not.toBe(second)
    expect(third).toBe(first) // toggles back to the plain form
  })

  it('resets the repeat marker once a different message interrupts a run of repeats', () => {
    announce('A', 'ambient')
    jest.advanceTimersByTime(100)
    announce('A', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('A' + '\u200B')

    announce('B', 'ambient')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('B') // fresh message, no marker
  })

  it('latest action wins: rapid actions announce only the most recent', () => {
    announce('First', 'action')
    jest.advanceTimersByTime(200) // still within debounce window
    announce('Second', 'action') // resets the debounce

    jest.advanceTimersByTime(600) // let the second one land
    expect(mapStatusRef.current.textContent).toBe('Second')
  })
})

describe('createAnnouncer — startup grace delay', () => {
  // A consumer calling showHint() the instant the app is ready (e.g. on
  // 'app:ready') can fire before the screen reader has finished registering
  // the live region in its own accessibility tree, even though the DOM node
  // already exists and mutates correctly. These tests use a small explicit
  // window (rather than the real 1000ms default) purely so assertions don't
  // need to advance unrealistic amounts of fake time.
  const GRACE = 300
  let mapStatusRef
  let announce

  beforeEach(() => {
    mapStatusRef = { current: { textContent: '' } }
    announce = createAnnouncer(mapStatusRef, { startupGraceDelay: GRACE })
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('delays an announcement fired immediately after creation by the full grace window', () => {
    announce('Ready', 'ambient')
    jest.advanceTimersByTime(100) // normal CLEAR_DELAY only
    expect(mapStatusRef.current.textContent).toBe('') // still withheld

    jest.advanceTimersByTime(GRACE) // the rest of the grace window
    expect(mapStatusRef.current.textContent).toBe('Ready')
  })

  it('only waits out the remaining grace window, not the full window again', () => {
    jest.advanceTimersByTime(200) // partway through the grace window already
    announce('Ready', 'ambient')

    // Remaining grace (100) + CLEAR_DELAY (100) = 200 total from this point
    jest.advanceTimersByTime(199)
    expect(mapStatusRef.current.textContent).toBe('')

    jest.advanceTimersByTime(1)
    expect(mapStatusRef.current.textContent).toBe('Ready')
  })

  it('adds no extra delay once the grace window has fully elapsed', () => {
    jest.advanceTimersByTime(GRACE)
    announce('Later', 'ambient')

    jest.advanceTimersByTime(100) // normal CLEAR_DELAY only
    expect(mapStatusRef.current.textContent).toBe('Later')
  })

  it('defaults to a 1000ms grace window when not configured', () => {
    const defaultAnnounce = createAnnouncer(mapStatusRef)
    defaultAnnounce('Ready', 'ambient')

    // 1000ms grace + 100ms CLEAR_DELAY = 1100 total
    jest.advanceTimersByTime(1099)
    expect(mapStatusRef.current.textContent).toBe('')

    jest.advanceTimersByTime(1)
    expect(mapStatusRef.current.textContent).toBe('Ready')
  })
})
