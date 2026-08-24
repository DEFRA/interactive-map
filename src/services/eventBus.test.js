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

  it('once fires the handler exactly once', () => {
    const handler = jest.fn()
    eventBus.once('single', handler)

    eventBus.emit('single', 'a')
    eventBus.emit('single', 'b')

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith('a')
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

describe('emitWhenReady', () => {
  beforeEach(() => {
    eventBus.destroy()
  })

  it('fires immediately when listeners are already registered', () => {
    const handler = jest.fn()
    eventBus.on('ready', handler)

    eventBus.emitWhenReady('ready', 'value')

    expect(handler).toHaveBeenCalledWith('value')
  })

  it('queues the call and replays to the first subscriber when no listeners exist', () => {
    const handler = jest.fn()

    eventBus.emitWhenReady('ready', 'value')
    expect(handler).not.toHaveBeenCalled()

    eventBus.on('ready', handler)
    expect(handler).toHaveBeenCalledWith('value')
  })

  it('clears the queue after replaying so subsequent subscribers do not receive it', () => {
    const first = jest.fn()
    const second = jest.fn()

    eventBus.emitWhenReady('ready', 'value')
    eventBus.on('ready', first)
    eventBus.on('ready', second)

    expect(first).toHaveBeenCalledWith('value')
    expect(second).not.toHaveBeenCalled()
  })

  it('replaces a queued value if emitWhenReady is called again before a subscriber arrives', () => {
    const handler = jest.fn()

    eventBus.emitWhenReady('ready', 'first')
    eventBus.emitWhenReady('ready', 'second')
    eventBus.on('ready', handler)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith('second')
  })

  it('catches and logs errors thrown by a handler during queued replay', () => {
    const error = new Error('boom')
    const handler = jest.fn(() => { throw error })
    jest.spyOn(console, 'error').mockImplementation(() => {})

    eventBus.emitWhenReady('ready', 'value')
    eventBus.on('ready', handler)

    expect(console.error).toHaveBeenCalledWith("Error in event handler for 'ready':", error)
    console.error.mockRestore()
  })

  it('clears queued events on destroy', () => {
    const handler = jest.fn()

    eventBus.emitWhenReady('ready', 'value')
    eventBus.destroy()
    eventBus.on('ready', handler)

    expect(handler).not.toHaveBeenCalled()
  })
})

describe('emitWhenRequested', () => {
  let bus
  beforeEach(() => { bus = createEventBus() })

  it('immediately emits eventNameReady so an already-waiting listener receives the args', () => {
    const handler = jest.fn()
    bus.on('datasets:registryReady', handler)
    bus.emitWhenRequested('datasets:registry', 'registryValue')
    expect(handler).toHaveBeenCalledWith('registryValue')
  })

  it('emits eventNameReady with args whenever eventNameRequested fires after registration', () => {
    const handler = jest.fn()
    bus.on('datasets:registryReady', handler)
    bus.emitWhenRequested('datasets:registry', 'registryValue')
    handler.mockClear()
    bus.emit('datasets:registryRequested')
    expect(handler).toHaveBeenCalledWith('registryValue')
  })

  it('forwards multiple args to the Ready event', () => {
    const handler = jest.fn()
    bus.on('datasets:registryReady', handler)
    bus.emitWhenRequested('datasets:registry', 'a', 'b')
    expect(handler).toHaveBeenCalledWith('a', 'b')
  })

  it('returns a cleanup function that stops responding to future Requested events', () => {
    const handler = jest.fn()
    bus.on('datasets:registryReady', handler)
    const remove = bus.emitWhenRequested('datasets:registry', 'registryValue')
    handler.mockClear()
    remove()
    bus.emit('datasets:registryRequested')
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('requestOnce', () => {
  let bus
  beforeEach(() => { bus = createEventBus() })

  it('calls the handler when eventNameReady fires', () => {
    const handler = jest.fn()
    bus.requestOnce('datasets:registry', handler)
    bus.emit('datasets:registryReady', 'registryValue')
    expect(handler).toHaveBeenCalledWith('registryValue')
  })

  it('calls the handler only once even if eventNameReady fires multiple times', () => {
    const handler = jest.fn()
    bus.requestOnce('datasets:registry', handler)
    bus.emit('datasets:registryReady', 'first')
    bus.emit('datasets:registryReady', 'second')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('emits eventNameRequested so the provider side knows it is needed', () => {
    const requestedHandler = jest.fn()
    bus.on('datasets:registryRequested', requestedHandler)
    bus.requestOnce('datasets:registry', jest.fn())
    expect(requestedHandler).toHaveBeenCalled()
  })

  it('returns this for chaining', () => {
    expect(bus.requestOnce('datasets:registry', jest.fn())).toBe(bus)
  })

  it('works with emitWhenRequested when requestOnce is called first', () => {
    const handler = jest.fn()
    bus.requestOnce('datasets:registry', handler)
    bus.emitWhenRequested('datasets:registry', 'registryValue')
    expect(handler).toHaveBeenCalledWith('registryValue')
  })

  it('works with emitWhenRequested when emitWhenRequested is called first', () => {
    const handler = jest.fn()
    bus.emitWhenRequested('datasets:registry', 'registryValue')
    bus.requestOnce('datasets:registry', handler)
    expect(handler).toHaveBeenCalledWith('registryValue')
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
