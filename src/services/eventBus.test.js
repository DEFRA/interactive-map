// src/services/eventBus.test.js
import eventBus, { createEventBus } from './eventBus.js'

describe('EventBus singleton', () => {
  beforeEach(() => {
    eventBus.destroy()
  })

  it('registers and emits events with arguments', () => {
    const handler = jest.fn()
    eventBus.on('test', handler)

    eventBus.emit('test', 'arg1', 123)

    expect(handler).toHaveBeenCalledWith('arg1', 123)
  })

  it('supports multiple handlers for the same event', () => {
    const handler1 = jest.fn()
    const handler2 = jest.fn()
    eventBus.on('multi', handler1).on('multi', handler2)

    eventBus.emit('multi', 'data')

    expect(handler1).toHaveBeenCalledWith('data')
    expect(handler2).toHaveBeenCalledWith('data')
  })

  it('removes a specific handler with off(event, handler)', () => {
    const handler = jest.fn()
    eventBus.on('remove', handler)

    eventBus.off('remove', handler)
    eventBus.emit('remove', 'x')

    expect(handler).not.toHaveBeenCalled()
  })

  it('removes all handlers when no handler is passed to off', () => {
    const handler1 = jest.fn()
    const handler2 = jest.fn()
    eventBus.on('clear', handler1).on('clear', handler2)

    eventBus.off('clear')
    eventBus.emit('clear', 'y')

    expect(handler1).not.toHaveBeenCalled()
    expect(handler2).not.toHaveBeenCalled()
  })

  it('does nothing when emitting an event with no listeners', () => {
    // Should not throw
    expect(() => eventBus.emit('noListeners')).not.toThrow()
  })

  it('off returns the bus if event has no handlers', () => {
    expect(eventBus.off('nonexistent')).toBe(eventBus)
  })

  it('emit returns the bus if event has no handlers', () => {
    expect(eventBus.emit('nonexistent')).toBe(eventBus)
  })

  it('catches and logs errors from handlers', () => {
    const error = new Error('boom')
    const badHandler = jest.fn(() => { throw error })
    const goodHandler = jest.fn()

    jest.spyOn(console, 'error').mockImplementation(() => {})

    eventBus.on('errorEvent', badHandler).on('errorEvent', goodHandler)

    eventBus.emit('errorEvent', 'safe')

    expect(badHandler).toHaveBeenCalled()
    expect(goodHandler).toHaveBeenCalledWith('safe')
    expect(console.error).toHaveBeenCalledWith(
      "Error in event handler for 'errorEvent':",
      error
    )

    console.error.mockRestore()
  })

  it('destroys all events', () => {
    const handler = jest.fn()
    eventBus.on('destroyMe', handler)

    eventBus.destroy()
    eventBus.emit('destroyMe', 'test')

    expect(handler).not.toHaveBeenCalled()
    expect(eventBus.events).toEqual({})
  })
})

describe('createEventBus factory', () => {
  /**
   * Test to ensure coverage for the factory function (Line 50).
   * Validates that createEventBus returns a fresh, working EventBus instance.
   */
  it('creates a new, independent EventBus instance', () => {
    const newBus = createEventBus()
    const handler = jest.fn()

    // Verify it is an instance of the same logic
    expect(newBus).toHaveProperty('on')
    expect(newBus).toHaveProperty('emit')

    // Verify it is independent of the singleton
    newBus.on('instanceTest', handler)
    eventBus.emit('instanceTest', 'data') // Emit on singleton
    expect(handler).not.toHaveBeenCalled()

    newBus.emit('instanceTest', 'data') // Emit on the new instance
    expect(handler).toHaveBeenCalledWith('data')
  })
})
