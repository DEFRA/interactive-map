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
    announce(undefined, 'core')
    expect(mapStatusRef.current.textContent).toBe('')
  })

  it('does nothing if mapStatusRef.current is null', () => {
    const announceWithNull = createAnnouncer({ current: null })
    announceWithNull('Hello')
    jest.advanceTimersByTime(1000)
    expect(true).toBe(true) // just confirm no throw
  })

  it('returns early if mapStatusRef.current becomes null during setTimeout', () => {
    announce('Test message', 'plugin')
    expect(mapStatusRef.current.textContent).toBe('') // cleared immediately

    // Set current to null before setTimeout fires
    mapStatusRef.current = null

    jest.advanceTimersByTime(100)
    // Should not throw, just return early
    expect(true).toBe(true)
  })

  it('sets textContent for a plugin message immediately', () => {
    announce('Plugin message', 'plugin')
    expect(mapStatusRef.current.textContent).toBe('') // cleared immediately
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Plugin message')
  })

  it('sets textContent for a core message after debounce + clear', () => {
    announce('Core message', 'core')
    expect(mapStatusRef.current.textContent).toBe('') // cleared immediately

    // advance only CLEAR_DELAY should still be empty due to debounce
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('')

    // advance DEBOUNCE_DELAY to trigger actual announcement
    jest.advanceTimersByTime(500)
    expect(mapStatusRef.current.textContent).toBe('Core message')
  })

  it('respects priority lock when plugin message is sent', () => {
    // plugin sets lock
    announce('Plugin message', 'plugin')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Plugin message')

    // core message should be skipped due to lock
    announce('Core message', 'core')
    jest.advanceTimersByTime(600) // DEBOUNCE_DELAY + CLEAR_DELAY
    expect(mapStatusRef.current.textContent).toBe('Plugin message')

    // next core message should work
    announce('Next core message', 'core')
    jest.advanceTimersByTime(100) // clear first
    jest.advanceTimersByTime(500) // debounce
    expect(mapStatusRef.current.textContent).toBe('Next core message')
  })

  it('plugin messages always set priority lock and show immediately', () => {
    announce('Plugin 1', 'plugin')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Plugin 1')

    announce('Plugin 2', 'plugin')
    jest.advanceTimersByTime(100)
    expect(mapStatusRef.current.textContent).toBe('Plugin 2')
  })
})
