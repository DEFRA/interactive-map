import { createEventBus } from './eventBus.js'

describe('createEventBus', () => {
  test('emits to a registered handler with the supplied arguments', () => {
    const bus = createEventBus()
    const handler = jest.fn()
    bus.on('thing', handler)

    bus.emit('thing', 1, 2)

    expect(handler).toHaveBeenCalledWith(1, 2)
  })

  test('supports multiple handlers for the same type', () => {
    const bus = createEventBus()
    const a = jest.fn()
    const b = jest.fn()
    bus.on('thing', a)
    bus.on('thing', b)

    bus.emit('thing')

    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  test('off removes a handler so it no longer fires', () => {
    const bus = createEventBus()
    const handler = jest.fn()
    bus.on('thing', handler)
    bus.off('thing', handler)

    bus.emit('thing')

    expect(handler).not.toHaveBeenCalled()
  })

  test('emitting a type with no listeners is a no-op', () => {
    const bus = createEventBus()
    expect(() => bus.emit('nothing')).not.toThrow()
  })

  test('off on an unknown type does not throw', () => {
    const bus = createEventBus()
    expect(() => bus.off('unknown', jest.fn())).not.toThrow()
  })
})
