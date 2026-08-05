import polygonSplitter from 'polygon-splitter'
import turfUnion from '@turf/union'
import {
  toTurfGeometry,
  splitPolygon,
  mergePolygons,
  extendLine,
  isNewCoordinate,
  isValidClick,
  isValidLineClick,
  spatialNavigate
} from './spatial.js'

jest.mock('polygon-splitter', () => jest.fn())
jest.mock('@turf/union', () => jest.fn())

beforeEach(() => jest.clearAllMocks())

describe('toTurfGeometry', () => {
  test.each([
    ['Polygon', { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] }],
    ['MultiPolygon', { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] }],
    ['LineString', { type: 'LineString', coordinates: [[0, 0], [1, 1]] }],
    ['MultiLineString', { type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]]] }],
    ['Point', { type: 'Point', coordinates: [0, 0] }],
    ['MultiPoint', { type: 'MultiPoint', coordinates: [[0, 0], [1, 1]] }]
  ])('converts a raw %s geometry', (type, geom) => {
    expect(toTurfGeometry(geom).geometry.type).toBe(type)
  })

  test('unwraps a Feature via its .geometry property', () => {
    const feature = { geometry: { type: 'Point', coordinates: [0, 0] } }
    expect(toTurfGeometry(feature).geometry.type).toBe('Point')
  })

  test('throws for unsupported geometry types', () => {
    expect(() => toTurfGeometry({ type: 'GeometryCollection' }))
      .toThrow('Unsupported geometry type: GeometryCollection')
  })
})

describe('extendLine', () => {
  test('extends a two-point line at both ends, along each segment\'s own direction', () => {
    const line = { geometry: { coordinates: [[0, 0], [0, 10]] } }
    const result = extendLine(line, 0.1)
    expect(result.geometry.type).toBe('LineString')
    // Start moves further away from the second point (backward); end moves
    // further away from the second-to-last point (forward).
    expect(result.geometry.coordinates).toEqual([[0, -1], [0, 11]])
  })

  test('extends only the endpoints of a multi-point line', () => {
    const line = { geometry: { coordinates: [[0, 0], [0, 1], [0, 2]] } }
    const result = extendLine(line, 0.1)
    expect(result.geometry.coordinates).toHaveLength(3)
    expect(result.geometry.coordinates[1]).toEqual([0, 1]) // middle vertex untouched
  })

  test('is pure planar math — correct at British National Grid scale (large eastings/northings)', () => {
    // Geodesic bearing/destination would misread these as out-of-range lon/lat
    // degrees and wrap them; plain vector extension has no such assumption.
    const line = { geometry: { coordinates: [[337600, 504600], [337650, 504650]] } }
    const result = extendLine(line, 0.1)
    expect(result.geometry.coordinates[0]).toEqual([337595, 504595])
    expect(result.geometry.coordinates[1]).toEqual([337655, 504655])
  })
})

describe('splitPolygon', () => {
  const polygon = {
    id: 'sq',
    properties: { id: 'sq', name: 'field' },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]] }
  }
  const line = { geometry: { type: 'LineString', coordinates: [[2, -1], [2, 5]] } }

  const twoPolygonResult = {
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        [[[0, 0], [2, 0], [2, 4], [0, 4], [0, 0]]],
        [[[2, 0], [4, 0], [4, 4], [2, 4], [2, 0]]]
      ]
    }
  }

  test('returns a two-feature collection for a valid split', () => {
    polygonSplitter.mockReturnValue(twoPolygonResult)

    const result = splitPolygon(polygon, line)

    expect(result.type).toBe('FeatureCollection')
    expect(result.features).toHaveLength(2)
    expect(result.features[0].id).toBe('sq-1')
    expect(result.features[1].id).toBe('sq-2')
    expect(result.features[0].properties).toMatchObject({ id: 'sq', name: 'field' })
  })

  test('returns null when the splitter throws', () => {
    polygonSplitter.mockImplementation(() => { throw new Error('bad geometry') })
    expect(splitPolygon(polygon, line)).toBeNull()
  })

  test('returns null when the result is not a MultiPolygon', () => {
    polygonSplitter.mockReturnValue({ geometry: { type: 'Polygon', coordinates: [] } })
    expect(splitPolygon(polygon, line)).toBeNull()
  })

  test('returns null when the split does not produce exactly two polygons', () => {
    polygonSplitter.mockReturnValue({ geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 0], [1, 1], [0, 0]]]] } })
    expect(splitPolygon(polygon, line)).toBeNull()
  })

  test('derives the base id from properties.id then a default', () => {
    polygonSplitter.mockReturnValue(twoPolygonResult)

    const noTopLevelId = { properties: { id: 'pid' }, geometry: polygon.geometry }
    expect(splitPolygon(noTopLevelId, line).features[0].id).toBe('pid-1')

    const anonymous = { properties: {}, geometry: polygon.geometry }
    expect(splitPolygon(anonymous, line).features[0].id).toBe('poly-1')
  })
})

describe('mergePolygons', () => {
  const squareA = {
    id: 'sq-a',
    properties: { id: 'sq-a', name: 'field' },
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] }
  }
  const squareB = {
    id: 'sq-b',
    properties: { id: 'sq-b' },
    geometry: { type: 'Polygon', coordinates: [[[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]]] }
  }

  const mergedResult = {
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [2, 0], [2, 1], [0, 1], [0, 0]]] }
  }

  test('returns a single merged polygon for a valid union', () => {
    turfUnion.mockReturnValue(mergedResult)

    const result = mergePolygons([squareA, squareB])

    expect(result.geometry.type).toBe('Polygon')
    expect(result.id).toBe('sq-a')
    expect(result.properties).toMatchObject({ id: 'sq-a', name: 'field' })
  })

  test('returns null when union throws', () => {
    turfUnion.mockImplementation(() => { throw new Error('bad geometry') })
    expect(mergePolygons([squareA, squareB])).toBeNull()
  })

  test('returns null when the inputs are not contiguous (MultiPolygon result)', () => {
    turfUnion.mockReturnValue({ geometry: { type: 'MultiPolygon', coordinates: [] } })
    expect(mergePolygons([squareA, squareB])).toBeNull()
  })

  test('returns null when union returns null', () => {
    turfUnion.mockReturnValue(null)
    expect(mergePolygons([squareA, squareB])).toBeNull()
  })

  test('derives the base id from properties.id then a default', () => {
    turfUnion.mockReturnValue(mergedResult)

    const noTopLevelId = { properties: { id: 'pid' }, geometry: squareA.geometry }
    expect(mergePolygons([noTopLevelId, squareB]).id).toBe('pid')

    const anonymous = { properties: {}, geometry: squareA.geometry }
    expect(mergePolygons([anonymous, squareB]).id).toBe('poly')
  })
})

describe('isNewCoordinate', () => {
  test('is true for a ring with a single point', () => {
    expect(isNewCoordinate([[[0, 0]]])).toBe(true)
  })

  test('is false when a small ring has coincident points', () => {
    expect(isNewCoordinate([[[0, 0], [0, 0]]])).toBe(false)
  })

  test('is true when a small ring has distinct points', () => {
    expect(isNewCoordinate([[[0, 0], [10, 10]]])).toBe(true)
  })

  test('skips the duplicate check for larger rings', () => {
    expect(isNewCoordinate([[[0, 0], [0, 0], [1, 1], [2, 2], [3, 3]]])).toBe(true)
  })
})

describe('isValidClick', () => {
  test('is true when the ring has a single point', () => {
    expect(isValidClick([[[0, 0]]])).toBe(true)
  })

  test('is true for a new (non-duplicate) coordinate', () => {
    expect(isValidClick([[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]])).toBe(true)
  })

  test('is false when a small ring repeats a coordinate', () => {
    expect(isValidClick([[[0, 0], [0, 0]]])).toBe(false)
  })
})

describe('isValidLineClick', () => {
  test('is true for the first coordinate', () => {
    expect(isValidLineClick([[0, 0]])).toBe(true)
  })

  test('is true when the last two coordinates differ', () => {
    expect(isValidLineClick([[0, 0], [10, 10]])).toBe(true)
  })

  test('is false when the last two coordinates coincide', () => {
    expect(isValidLineClick([[0, 0], [0, 0]])).toBe(false)
  })
})

describe('spatialNavigate', () => {
  const start = [0, 0]
  const pixels = [[0, 0], [0, -10], [0, 10], [-10, 0], [10, 0]]

  test.each([
    ['ArrowUp', 1],
    ['ArrowDown', 2],
    ['ArrowLeft', 3],
    ['ArrowRight', 4]
  ])('finds the nearest pixel for %s', (direction, expectedIndex) => {
    expect(spatialNavigate(start, pixels, direction)).toBe(expectedIndex)
  })

  test('considers all pixels for an unrecognised direction', () => {
    expect(spatialNavigate(start, pixels, 'Tab')).toBe(1)
  })

  test('falls back to the start point when no pixel is in the quadrant', () => {
    expect(spatialNavigate(start, [[0, 0]], 'ArrowUp')).toBe(0)
  })
})
