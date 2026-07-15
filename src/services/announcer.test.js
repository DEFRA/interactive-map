import { createAnnouncer } from './announcer.js'

jest.useFakeTimers()

describe('createAnnouncer', () => {
  let mapStatusRef
  let announce

  beforeEach(() => {
    mapStatusRef = { current: { textContent: '' } }
    announce = createAnnouncer(mapStatusRef)
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

  it('latest action wins: rapid actions announce only the most recent', () => {
    announce('First', 'action')
    jest.advanceTimersByTime(200) // still within debounce window
    announce('Second', 'action') // resets the debounce

    jest.advanceTimersByTime(600) // let the second one land
    expect(mapStatusRef.current.textContent).toBe('Second')
  })
})
