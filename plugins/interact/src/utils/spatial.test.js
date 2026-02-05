import { toTurfGeometry, isContiguousWithAny, canSplitFeatures, areAllContiguous } from './spatial.js'
import { polygon, multiPolygon, lineString, multiLineString, point, multiPoint } from '@turf/helpers'

describe('toTurfGeometry', () => {
  const geomTypes = [
    { type: 'Polygon', coords: [[[0,0],[1,0],[1,1],[0,0]]], fn: polygon },
    { type: 'MultiPolygon', coords: [[[[0,0],[1,0],[1,1],[0,0]]]], fn: multiPolygon },
    { type: 'LineString', coords: [[0,0],[1,1]], fn: lineString },
    { type: 'MultiLineString', coords: [[[0,0],[1,1]]], fn: multiLineString },
    { type: 'Point', coords: [0,0], fn: point },
    { type: 'MultiPoint', coords: [[0,0],[1,1]], fn: multiPoint }
  ]

  geomTypes.forEach(({ type, coords, fn }) => {
    it(`converts ${type} Feature`, () => {
      const feature = { type: 'Feature', geometry: { type, coordinates: coords } }
      expect(toTurfGeometry(feature)).toEqual(fn(coords))
    })

    it(`converts raw ${type} geometry`, () => {
      const geom = { type, coordinates: coords }
      expect(toTurfGeometry(geom)).toEqual(fn(coords))
    })
  })

  it('throws on unsupported geometry', () => {
    expect(() => toTurfGeometry({ type: 'Feature', geometry: { type: 'Circle', coordinates: [] } }))
      .toThrow('Unsupported geometry type: Circle')
  })
})

describe('isContiguousWithAny', () => {
  const makePolygonFeature = (coords) => ({
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] }
  })

  const featureA = makePolygonFeature([[0,0],[2,0],[2,2],[0,2],[0,0]])
  const featureB = makePolygonFeature([[2,0],[4,0],[4,2],[2,2],[2,0]]) // shares edge with A
  const featureC = makePolygonFeature([[5,5],[7,5],[7,7],[5,7],[5,5]]) // disjoint from A and B

  it('returns true when feature overlaps with one in the array', () => {
    const overlapping = makePolygonFeature([[1,0],[3,0],[3,2],[1,2],[1,0]]) // overlaps A
    expect(isContiguousWithAny(overlapping, [featureA])).toBe(true)
  })

  it('returns true when feature shares an edge with one in the array', () => {
    expect(isContiguousWithAny(featureB, [featureA])).toBe(true)
  })

  it('returns true when feature is contiguous with at least one in the array', () => {
    expect(isContiguousWithAny(featureB, [featureC, featureA])).toBe(true)
  })

  it('returns false when feature is disjoint from all features', () => {
    expect(isContiguousWithAny(featureC, [featureA, featureB])).toBe(false)
  })

  it('returns false when features array is empty', () => {
    expect(isContiguousWithAny(featureA, [])).toBe(false)
  })
})

describe('canSplitFeatures', () => {
  it.each([
    [[{ geometry: { type: 'Polygon' } }], true],
    [[{ geometry: { type: 'MultiPolygon' } }], true],
    [[{ geometry: { type: 'LineString' } }], false],
    [[], false],
    [[{ geometry: { type: 'Polygon' } }, { geometry: { type: 'Polygon' } }], false]
  ])('returns expected result for %j', (features, expected) => {
    expect(canSplitFeatures(features)).toBe(expected)
  })
})

describe('areAllContiguous', () => {
  const poly = (coords) => ({ geometry: { type: 'Polygon', coordinates: [coords] } })
  const A = poly([[0,0],[2,0],[2,2],[0,2],[0,0]])
  const B = poly([[2,0],[4,0],[4,2],[2,2],[2,0]]) // touches A
  const C = poly([[4,0],[6,0],[6,2],[4,2],[4,0]]) // touches B
  const D = poly([[10,10],[12,10],[12,12],[10,12],[10,10]]) // isolated

  it.each([
    [[], false],
    [[A], false],
    [[A, B], true],
    [[A, B, C], true],
    [[A, D], false],
    [[A, B, D], false]
  ])('returns expected result for %# features', (features, expected) => {
    expect(areAllContiguous(features)).toBe(expected)
  })
})
