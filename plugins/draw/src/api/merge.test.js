import { merge } from './merge.js'
import { mergePolygons } from '../utils/spatial.js'

jest.mock('../utils/spatial.js', () => ({ mergePolygons: jest.fn() }))

const makeContext = (overrides = {}) => {
  const eventBus = { emit: jest.fn() }
  const draw = { get: jest.fn((id) => ({ id })) }
  const context = {
    mapProvider: { draw },
    services: { eventBus },
    ...overrides
  }
  return { context, draw, eventBus }
}

beforeEach(() => jest.clearAllMocks())

describe('merge', () => {
  test('does nothing when there is no draw instance', () => {
    const { context, eventBus } = makeContext({ mapProvider: { draw: null } })
    expect(merge(context, ['a', 'b'])).toBeNull()
    expect(eventBus.emit).not.toHaveBeenCalled()
  })

  test('resolves each feature id via the adapter and merges them', () => {
    const { context, draw } = makeContext()
    mergePolygons.mockReturnValue({ id: 'a', geometry: { type: 'Polygon', coordinates: [] } })

    merge(context, ['a', 'b'])

    expect(draw.get).toHaveBeenCalledWith('a')
    expect(draw.get).toHaveBeenCalledWith('b')
    expect(mergePolygons).toHaveBeenCalledWith([{ id: 'a' }, { id: 'b' }])
  })

  test('returns the merged feature and emits draw:merge on success', () => {
    const { context, eventBus } = makeContext()
    const feature = { id: 'a', geometry: { type: 'Polygon', coordinates: [] } }
    mergePolygons.mockReturnValue(feature)

    const result = merge(context, ['a', 'b'])

    expect(result).toBe(feature)
    expect(eventBus.emit).toHaveBeenCalledWith('draw:merge', { originalFeatureIds: ['a', 'b'], feature })
  })

  test('returns null and does not emit when the merge fails', () => {
    const { context, eventBus } = makeContext()
    mergePolygons.mockReturnValue(null)

    const result = merge(context, ['a', 'b'])

    expect(result).toBeNull()
    expect(eventBus.emit).not.toHaveBeenCalled()
  })
})
