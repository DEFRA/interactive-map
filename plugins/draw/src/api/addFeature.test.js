import { addFeature } from './addFeature.js'
import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../utils/flattenStyleProperties.js', () => ({
  flattenStyleProperties: jest.fn(() => ({ _flat: true }))
}))
jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() }
}))

const setup = (draw) => {
  const eventBus = { emit: jest.fn() }
  return { context: { mapProvider: { draw }, services: { eventBus } }, eventBus }
}

beforeEach(() => jest.clearAllMocks())

describe('addFeature', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = setup(undefined)
    addFeature(context, { id: 'a' })
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('flattens style properties, defaults type to Feature, and adds the feature', () => {
    const draw = { add: jest.fn() }
    const { context, eventBus } = setup(draw)
    const feature = {
      id: 'a',
      geometry: { type: 'Point', coordinates: [0, 0] },
      stroke: 'red',
      fill: 'blue',
      strokeWidth: 2,
      properties: { name: 'x' }
    }

    addFeature(context, feature)

    expect(flattenStyleProperties).toHaveBeenCalledWith({ stroke: 'red', fill: 'blue', strokeWidth: 2 })
    const expected = {
      type: 'Feature',
      id: 'a',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { name: 'x', _flat: true }
    }
    expect(draw.add).toHaveBeenCalledWith(expected)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:add', expected)
  })

  test('handles a feature without existing properties', () => {
    const draw = { add: jest.fn() }
    const { context } = setup(draw)
    addFeature(context, { id: 'b', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } })
    expect(draw.add).toHaveBeenCalledWith({
      type: 'Feature',
      id: 'b',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      properties: { _flat: true }
    })
  })

  test('does not override an explicitly supplied type', () => {
    const draw = { add: jest.fn() }
    const { context } = setup(draw)
    addFeature(context, { id: 'c', type: 'Feature', geometry: { type: 'Polygon', coordinates: [[]] } })
    expect(draw.add).toHaveBeenCalledWith(expect.objectContaining({ type: 'Feature' }))
  })

  // A missing/unsupported geometry is a genuine caller mistake — warned and dropped rather
  // than handed to an adapter that would throw or silently misread it.
  describe('invalid geometry', () => {
    test('rejects a feature with no geometry at all', () => {
      const draw = { add: jest.fn() }
      const { context, eventBus } = setup(draw)
      addFeature(context, { id: 'd' })
      expect(draw.add).not.toHaveBeenCalled()
      expect(eventBus.emit).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith('addFeature: ignoring invalid GeoJSON feature', expect.objectContaining({ id: 'd' }))
    })

    test('rejects an unsupported geometry type', () => {
      const draw = { add: jest.fn() }
      const { context } = setup(draw)
      addFeature(context, { id: 'e', geometry: { type: 'MultiPoint', coordinates: [[0, 0]] } })
      expect(draw.add).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalled()
    })

    test('rejects a geometry with no coordinates', () => {
      const draw = { add: jest.fn() }
      const { context } = setup(draw)
      addFeature(context, { id: 'f', geometry: { type: 'Point' } })
      expect(draw.add).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalled()
    })
  })
})
