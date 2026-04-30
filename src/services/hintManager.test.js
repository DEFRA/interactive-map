import { createHintManager } from './hintManager.js'

let announce
let manager

beforeEach(() => {
  jest.useFakeTimers()
  announce = jest.fn()
  manager = createHintManager(announce)
})

afterEach(() => {
  jest.useRealTimers()
})

// ─── hint() ──────────────────────────────────────────────────────────────────

describe('hint', () => {
  it('notifies subscribers with the html payload', () => {
    const sub = jest.fn()
    manager.subscribe(sub)
    manager.hint('<kbd>Enter</kbd> to select')
    expect(sub).toHaveBeenCalledWith({ html: '<kbd>Enter</kbd> to select' })
  })

  it('calls announce with stripped html', () => {
    manager.hint('<kbd>Enter</kbd> to select')
    expect(announce).toHaveBeenCalledWith('Enter to select', 'plugin')
  })

  it('calls announce with custom text when announce option is provided', () => {
    manager.hint('<kbd>Alt+K</kbd> help', { announce: 'Press Alt+K for keyboard controls' })
    expect(announce).toHaveBeenCalledWith('Press Alt+K for keyboard controls', 'plugin')
  })

  it('replaces an existing hint and resets the timer', () => {
    const sub = jest.fn()
    manager.subscribe(sub)
    manager.hint('first', { duration: 2000 })
    manager.hint('second', { duration: 2000 })
    jest.advanceTimersByTime(2000)
    expect(sub).toHaveBeenLastCalledWith(null)
    // Only one dismiss fired (the second hint's timer)
    expect(sub).toHaveBeenCalledTimes(3) // hint1, hint2, dismiss
  })

  it('auto-dismisses after duration', () => {
    const sub = jest.fn()
    manager.subscribe(sub)
    manager.hint('hello', { duration: 3000 })
    jest.advanceTimersByTime(3000)
    expect(sub).toHaveBeenLastCalledWith(null)
  })

  it('does not auto-dismiss when duration is 0', () => {
    const sub = jest.fn()
    manager.subscribe(sub)
    manager.hint('persistent', { duration: 0 })
    jest.advanceTimersByTime(60000)
    expect(sub).not.toHaveBeenCalledWith(null)
  })
})

// ─── dismiss() ───────────────────────────────────────────────────────────────

describe('dismiss', () => {
  it('clears the active hint and notifies', () => {
    const sub = jest.fn()
    manager.subscribe(sub)
    manager.hint('hello')
    manager.dismiss()
    expect(sub).toHaveBeenLastCalledWith(null)
  })

  it('cancels the auto-dismiss timer', () => {
    const sub = jest.fn()
    manager.subscribe(sub)
    manager.hint('hello', { duration: 3000 })
    manager.dismiss()
    sub.mockClear()
    jest.advanceTimersByTime(3000)
    expect(sub).not.toHaveBeenCalled()
  })

  it('is safe to call when no hint is active', () => {
    expect(() => manager.dismiss()).not.toThrow()
  })
})

// ─── subscribe / unsubscribe ──────────────────────────────────────────────────

describe('subscribe', () => {
  it('returns an unsubscribe function', () => {
    const sub = jest.fn()
    const unsub = manager.subscribe(sub)
    unsub()
    manager.hint('hello')
    expect(sub).not.toHaveBeenCalled()
  })

  it('notifies multiple subscribers', () => {
    const sub1 = jest.fn()
    const sub2 = jest.fn()
    manager.subscribe(sub1)
    manager.subscribe(sub2)
    manager.hint('hello')
    expect(sub1).toHaveBeenCalled()
    expect(sub2).toHaveBeenCalled()
  })
})
