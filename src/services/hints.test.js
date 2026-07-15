import { createHints } from './hints.js'

let announce
let hints

beforeEach(() => {
  jest.useFakeTimers()
  announce = jest.fn()
  hints = createHints(announce)
})

afterEach(() => {
  jest.useRealTimers()
})

// ─── show() ──────────────────────────────────────────────────────────────────

describe('show', () => {
  it('notifies subscribers with the html payload', () => {
    const sub = jest.fn()
    hints.subscribe(sub)
    hints.show('<kbd>Enter</kbd> to select')
    expect(sub).toHaveBeenCalledWith({ html: '<kbd>Enter</kbd> to select' })
  })

  it('calls announce with stripped html', () => {
    hints.show('<kbd>Enter</kbd> to select')
    expect(announce).toHaveBeenCalledWith('Enter to select', 'ambient')
  })

  it('calls announce with custom text when announce option is provided', () => {
    hints.show('<kbd>Alt+K</kbd> help', { announce: 'Press Alt+K for keyboard controls' })
    expect(announce).toHaveBeenCalledWith('Press Alt+K for keyboard controls', 'ambient')
  })

  it('replaces an existing hint and resets the timer', () => {
    const sub = jest.fn()
    hints.subscribe(sub)
    hints.show('first', { duration: 2000 })
    hints.show('second', { duration: 2000 })
    jest.advanceTimersByTime(2000)
    expect(sub).toHaveBeenLastCalledWith(null)
    // Only one dismiss fired (the second hint's timer)
    expect(sub).toHaveBeenCalledTimes(3) // show1, show2, dismiss
  })

  it('auto-dismisses after duration', () => {
    const sub = jest.fn()
    hints.subscribe(sub)
    hints.show('hello', { duration: 3000 })
    jest.advanceTimersByTime(3000)
    expect(sub).toHaveBeenLastCalledWith(null)
  })

  it('does not auto-dismiss when duration is 0', () => {
    const sub = jest.fn()
    hints.subscribe(sub)
    hints.show('persistent', { duration: 0 })
    jest.advanceTimersByTime(60000)
    expect(sub).not.toHaveBeenCalledWith(null)
  })
})

// ─── dismiss() ───────────────────────────────────────────────────────────────

describe('dismiss', () => {
  it('clears the active hint and notifies', () => {
    const sub = jest.fn()
    hints.subscribe(sub)
    hints.show('hello')
    hints.dismiss()
    expect(sub).toHaveBeenLastCalledWith(null)
  })

  it('cancels the auto-dismiss timer', () => {
    const sub = jest.fn()
    hints.subscribe(sub)
    hints.show('hello', { duration: 3000 })
    hints.dismiss()
    sub.mockClear()
    jest.advanceTimersByTime(3000)
    expect(sub).not.toHaveBeenCalled()
  })

  it('is safe to call when no hint is active', () => {
    expect(() => hints.dismiss()).not.toThrow()
  })
})

// ─── subscribe / unsubscribe ──────────────────────────────────────────────────

describe('subscribe', () => {
  it('returns an unsubscribe function', () => {
    const sub = jest.fn()
    const unsub = hints.subscribe(sub)
    unsub()
    hints.show('hello')
    expect(sub).not.toHaveBeenCalled()
  })

  it('notifies multiple subscribers', () => {
    const sub1 = jest.fn()
    const sub2 = jest.fn()
    hints.subscribe(sub1)
    hints.subscribe(sub2)
    hints.show('hello')
    expect(sub1).toHaveBeenCalled()
    expect(sub2).toHaveBeenCalled()
  })
})
