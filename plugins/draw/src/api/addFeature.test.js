import { addFeature } from './addFeature.js'
import { logger } from '../../../../src/services/logger.js'

jest.mock('../../../../src/services/logger.js', () => ({
  logger: { warn: jest.fn(), error: jest.fn() }
}))

const setup = (draw, mapStyles = [{ id: 'outdoor' }, { id: 'dark' }]) => {
  const eventBus = { emit: jest.fn() }
  return { context: { mapState: { mapStyles }, mapProvider: { draw }, services: { eventBus } }, eventBus }
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
      stroke: { outdoor: 'red', dark: 'white' },
      fill: 'blue',
      strokeWidth: 2,
      properties: { name: 'x' }
    }

    addFeature(context, feature)

    const expected = {
      type: 'Feature',
      id: 'a',
      geometry: { type: 'Point', coordinates: [0, 0] },
      properties: { name: 'x', stroke: 'red', strokeOutdoor: 'red', strokeDark: 'white', fill: 'blue', strokeWidth: 2 }
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
      properties: {}
    })
  })

  // A feature saved from draw:created carries its style in properties, already flattened
  test('keeps a saved feature\'s style properties when no top-level style is given', () => {
    const draw = { add: jest.fn() }
    const { context } = setup(draw)
    const properties = { stroke: '#8b5a2b', strokeOutdoor: '#8b5a2b', strokeDark: '#d2a679', strokeWidth: 4, fill: 'green', landUse: 'hedge' }
    addFeature(context, { id: 'h', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties })
    expect(draw.add).toHaveBeenCalledWith(expect.objectContaining({ properties }))
  })

  test('flattens a per-style object given inside properties', () => {
    const draw = { add: jest.fn() }
    const { context } = setup(draw)
    addFeature(context, { id: 'h', geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] }, properties: { stroke: { outdoor: 'red', dark: 'white' } } })
    expect(draw.add).toHaveBeenCalledWith(expect.objectContaining({
      properties: { stroke: 'red', strokeOutdoor: 'red', strokeDark: 'white' }
    }))
  })

  test('a top-level style replaces that prop\'s saved values for each map style, leaving data and other props alone', () => {
    const draw = { add: jest.fn() }
    const { context } = setup(draw)
    addFeature(context, {
      id: 'h',
      geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
      stroke: '#d4351c',
      properties: { stroke: '#8b5a2b', strokeOutdoor: '#8b5a2b', strokeDark: '#d2a679', strokeWidth: 4, strokeWidthDark: 6, strokeNote: 'cut in March' }
    })
    expect(draw.add).toHaveBeenCalledWith(expect.objectContaining({
      properties: { stroke: '#d4351c', strokeWidth: 4, strokeWidthDark: 6, strokeNote: 'cut in March' }
    }))
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
