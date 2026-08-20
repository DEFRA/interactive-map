import { setStyle } from './setStyle.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() }
}))

const setup = (draw) => {
  const eventBus = { emit: jest.fn() }
  return { context: { mapProvider: { draw }, services: { eventBus } }, eventBus }
}

beforeEach(() => jest.clearAllMocks())

describe('setStyle', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = setup(undefined)
    expect(setStyle(context, 'a', { stroke: 'red' })).toBe(false)
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('warns and does nothing for an id with no existing feature', () => {
    const draw = { get: jest.fn(() => null), setStyle: jest.fn() }
    const { context, eventBus } = setup(draw)
    expect(setStyle(context, 'missing', { stroke: 'red' })).toBe(false)
    expect(draw.setStyle).not.toHaveBeenCalled()
    expect(eventBus.emit).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalledWith('setStyle: no feature found for id', 'missing')
  })

  test('flattens stroke/fill/strokeWidth and forwards symbol keys as-is', () => {
    const draw = { get: jest.fn(() => ({ id: 'a' })), setStyle: jest.fn() }
    const { context, eventBus } = setup(draw)

    const result = setStyle(context, 'a', {
      stroke: { outdoor: '#1d70b8', dark: '#4c9ed9' },
      symbol: 'square',
      symbolBackgroundColor: { outdoor: '#ca3535', dark: '#ffffff' }
    })

    const expected = {
      stroke: '#1d70b8',
      strokeOutdoor: '#1d70b8',
      strokeDark: '#4c9ed9',
      symbol: 'square',
      symbolBackgroundColor: { outdoor: '#ca3535', dark: '#ffffff' }
    }
    expect(draw.setStyle).toHaveBeenCalledWith('a', expected)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:stylechange', { featureId: 'a', properties: expected })
    expect(result).toBe(true)
  })

  // A partial patch — omitting fill/strokeWidth must leave whatever the feature already has
  // alone, not blank them out to undefined.
  test('only includes the style keys actually supplied, dropping the unset ones', () => {
    const draw = { get: jest.fn(() => ({ id: 'a' })), setStyle: jest.fn() }
    const { context } = setup(draw)
    setStyle(context, 'a', { stroke: '#e6c700' })
    expect(draw.setStyle).toHaveBeenCalledWith('a', { stroke: '#e6c700' })
  })

  test('defaults styleChanges to {} and still resolves cleanly', () => {
    const draw = { get: jest.fn(() => ({ id: 'a' })), setStyle: jest.fn() }
    const { context } = setup(draw)
    setStyle(context, 'a')
    expect(draw.setStyle).toHaveBeenCalledWith('a', {})
  })
})
