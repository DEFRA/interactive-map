import {
  getCoords, getMidpointCoords, getRingSegments, getSegmentForIndex, getModifiableCoords, coordPathToFlatIndex
} from './geometryHelpers.js'

const POLYGON = () => ({ type: 'Polygon', coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] })
const LINE = () => ({ type: 'LineString', coordinates: [[0, 0], [10, 0], [10, 10]] })

describe('geometryHelpers', () => {
  test('getCoords flattens every geometry type and guards missing input', () => {
    expect(getCoords(LINE())).toHaveLength(3)
    expect(getCoords(POLYGON())).toHaveLength(5)
    expect(getCoords({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2]]] })).toHaveLength(3)
    expect(getCoords({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 1]]], [[[2, 2]]]] })).toHaveLength(3)
    expect(getCoords({ type: 'Point', coordinates: [0, 0] })).toEqual([])
    expect(getCoords(null)).toEqual([])
  })

  test('getRingSegments describes each geometry type and guards missing input', () => {
    expect(getRingSegments(LINE())).toEqual([{ start: 0, length: 3, path: [], closed: false }])
    expect(getRingSegments(POLYGON())).toEqual([{ start: 0, length: 5, path: [0], closed: true }])
    expect(getRingSegments({ type: 'MultiLineString', coordinates: [[[0, 0], [1, 1]], [[2, 2]]] }))
      .toEqual([{ start: 0, length: 2, path: [0], closed: false }, { start: 2, length: 1, path: [1], closed: false }])
    expect(getRingSegments({ type: 'MultiPolygon', coordinates: [[[[0, 0], [1, 1]]], [[[2, 2]]]] }))
      .toEqual([{ start: 0, length: 2, path: [0, 0], closed: true }, { start: 2, length: 1, path: [1, 0], closed: true }])
    expect(getRingSegments({ type: 'Point', coordinates: [0, 0] })).toEqual([])
    expect(getRingSegments(null)).toEqual([])
  })

  test('getMidpointCoords finds the midpoint between each adjacent pair — no wrap for an open line, wrapping last→first for a closed ring', () => {
    expect(getMidpointCoords(LINE())).toEqual([[5, 0], [10, 5]])
    expect(getMidpointCoords(POLYGON())).toHaveLength(5) // closed ring: wraps, including the duplicate closing point
    expect(getMidpointCoords({ type: 'Point', coordinates: [0, 0] })).toEqual([])
    expect(getMidpointCoords(null)).toEqual([])
  })

  test('getSegmentForIndex finds the owning segment or returns null', () => {
    const segments = getRingSegments(POLYGON())
    expect(getSegmentForIndex(segments, 2)).toEqual({ segment: segments[0], localIdx: 2 })
    expect(getSegmentForIndex(segments, 99)).toBeNull()
  })

  test('getModifiableCoords walks the hierarchical path', () => {
    const geojson = { geometry: { type: 'MultiPolygon', coordinates: [[[[0, 0]]], [[[9, 9]]]] } }
    expect(getModifiableCoords(geojson, [1, 0])).toEqual([[9, 9]])
  })

  test('coordPathToFlatIndex resolves matched paths and falls back to the last index', () => {
    const poly = POLYGON()
    expect(coordPathToFlatIndex(poly, '0.2')).toBe(2)
    // Unmatched path falls back to the trailing number
    expect(coordPathToFlatIndex(poly, '5.7')).toBe(7)
  })
})
