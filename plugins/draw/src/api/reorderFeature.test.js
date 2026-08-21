import { reorderFeature } from './reorderFeature.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() }
}))

const setup = (draw) => {
  const eventBus = { emit: jest.fn() }
  return { context: { mapProvider: { draw }, services: { eventBus } }, eventBus }
}

beforeEach(() => jest.clearAllMocks())

describe('reorderFeature', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = setup(undefined)
    expect(reorderFeature(context, 'a', 'front')).toBe(false)
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('warns and does nothing for an id with no existing feature', () => {
    const draw = { get: jest.fn(() => null), moveToFront: jest.fn() }
    const { context, eventBus } = setup(draw)
    expect(reorderFeature(context, 'missing', 'front')).toBe(false)
    expect(draw.moveToFront).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('reorderFeature: no feature found for id', 'missing')
  })

  test('warns and does nothing for an invalid direction', () => {
    const draw = { get: jest.fn(() => ({ id: 'a' })) }
    const { context, eventBus } = setup(draw)
    expect(reorderFeature(context, 'a', 'sideways')).toBe(false)
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('reorderFeature: invalid direction', 'sideways')
  })

  test.each([
    ['front', 'moveToFront'],
    ['back', 'moveToBack'],
    ['forward', 'moveForward'],
    ['backward', 'moveBackward']
  ])('direction %s calls draw.%s and emits the full order', (direction, adapterMethod) => {
    const draw = { get: jest.fn(() => ({ id: 'a' })), [adapterMethod]: jest.fn(), getOrder: jest.fn(() => ['b', 'a']) }
    const { context, eventBus } = setup(draw)

    const result = reorderFeature(context, 'a', direction)

    expect(draw[adapterMethod]).toHaveBeenCalledWith('a')
    expect(eventBus.emit).toHaveBeenCalledWith('draw:orderchange', { order: ['b', 'a'] })
    expect(result).toBe(true)
  })
})
