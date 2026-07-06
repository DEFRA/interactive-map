import { getCoords, getRingSegments, getSegmentForIndex, getModifiableCoords, getMidpoints } from './geometryHelpers.js'

const SQUARE = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
const HOLE = [[2, 2], [4, 2], [4, 4], [2, 2]]
const LINE = [[0, 0], [10, 0], [20, 0]]

describe('getCoords flattens editable vertices (closing coords stripped)', () => {
  test.each([
    ['LineString', { type: 'LineString', coordinates: LINE }, 3],
    ['Polygon with hole', { type: 'Polygon', coordinates: [SQUARE, HOLE] }, 7],
    ['MultiLineString', { type: 'MultiLineString', coordinates: [LINE, LINE] }, 6],
    ['MultiPolygon', { type: 'MultiPolygon', coordinates: [[SQUARE], [SQUARE, HOLE]] }, 11]
  ])('%s', (_, geom, expected) => {
    expect(getCoords(geom)).toHaveLength(expected)
  })

  test('missing or unsupported geometry yields an empty array', () => {
    expect(getCoords(null)).toEqual([])
    expect(getCoords({ type: 'Point' })).toEqual([])
    expect(getCoords({ type: 'Point', coordinates: [0, 0] })).toEqual([])
  })
})

describe('getRingSegments maps flat indices back to parts', () => {
  test('describes each ring/part with its offset, length, path and closure', () => {
    expect(getRingSegments({ type: 'LineString', coordinates: LINE }))
      .toEqual([{ start: 0, length: 3, path: [], closed: false }])
    expect(getRingSegments({ type: 'Polygon', coordinates: [SQUARE, HOLE] }))
      .toEqual([
        { start: 0, length: 4, path: [0], closed: true },
        { start: 4, length: 3, path: [1], closed: true }
      ])
    expect(getRingSegments({ type: 'MultiLineString', coordinates: [LINE, LINE] })[1])
      .toEqual({ start: 3, length: 3, path: [1], closed: false })
    expect(getRingSegments({ type: 'MultiPolygon', coordinates: [[SQUARE], [HOLE]] })[1])
      .toEqual({ start: 4, length: 3, path: [1, 0], closed: true })
  })

  test('missing or unsupported geometry yields no segments', () => {
    expect(getRingSegments(null)).toEqual([])
    expect(getRingSegments({ type: 'Point', coordinates: [0, 0] })).toEqual([])
  })
})

describe('getSegmentForIndex', () => {
  const segments = getRingSegments({ type: 'Polygon', coordinates: [SQUARE, HOLE] })

  test('finds the owning segment and the local index within it', () => {
    expect(getSegmentForIndex(segments, 5)).toEqual({ segment: segments[1], localIdx: 1 })
  })

  test('returns null beyond the last segment', () => {
    expect(getSegmentForIndex(segments, 7)).toBeNull()
  })
})

test('getModifiableCoords returns a live reference at a hierarchical path', () => {
  const geom = { type: 'MultiPolygon', coordinates: [[SQUARE], [HOLE]] }
  const ring = getModifiableCoords(geom, [1, 0])
  ring[0] = [3, 3]
  expect(geom.coordinates[1][0][0]).toEqual([3, 3])
  expect(getModifiableCoords(geom, [])).toBe(geom.coordinates)
})

describe('getMidpoints', () => {
  test('closed rings wrap (one midpoint per vertex); open lines do not', () => {
    expect(getMidpoints({ type: 'Polygon', coordinates: [SQUARE] }))
      .toEqual([[5, 0], [10, 5], [5, 10], [0, 5]])
    expect(getMidpoints({ type: 'LineString', coordinates: LINE }))
      .toEqual([[5, 0], [15, 0]])
  })

  test('empty geometry yields no midpoints', () => {
    expect(getMidpoints({ type: 'LineString', coordinates: [] })).toEqual([])
  })
})
