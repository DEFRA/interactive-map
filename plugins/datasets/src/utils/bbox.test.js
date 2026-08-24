import { getBboxArray, bboxContains, expandBbox, bboxIntersects, getGeometryBbox } from './bbox.js'

// ─── getBboxArray ─────────────────────────────────────────────────────────────

describe('getBboxArray', () => {
  it('returns [west, south, east, north] from a map bounds object', () => {
    const map = {
      getBounds: () => ({
        getWest: () => -1,
        getSouth: () => 50,
        getEast: () => 1,
        getNorth: () => 52
      })
    }
    expect(getBboxArray(map)).toEqual([-1, 50, 1, 52])
  })
})

// ─── bboxContains ─────────────────────────────────────────────────────────────

describe('bboxContains', () => {
  const outer = [-2, 49, 2, 53]

  it('returns false when outer is null', () => {
    expect(bboxContains(null, [-1, 50, 1, 52])).toBe(false)
  })

  it('returns false when inner is null', () => {
    expect(bboxContains(outer, null)).toBe(false)
  })

  it('returns true when inner is fully inside outer', () => {
    expect(bboxContains(outer, [-1, 50, 1, 52])).toBe(true)
  })

  it('returns false when inner extends outside outer', () => {
    expect(bboxContains(outer, [-3, 50, 1, 52])).toBe(false)
  })
})

// ─── expandBbox ───────────────────────────────────────────────────────────────

describe('expandBbox', () => {
  it('returns a copy of addition when existing is null', () => {
    expect(expandBbox(null, [1, 2, 3, 4])).toEqual([1, 2, 3, 4])
  })

  it('returns the bounding union of existing and addition', () => {
    expect(expandBbox([-1, 49, 1, 51], [-2, 50, 2, 52])).toEqual([-2, 49, 2, 52])
  })
})

// ─── bboxIntersects ───────────────────────────────────────────────────────────

describe('bboxIntersects', () => {
  it('returns false when a is null', () => {
    expect(bboxIntersects(null, [0, 0, 1, 1])).toBe(false)
  })

  it('returns false when b is null', () => {
    expect(bboxIntersects([0, 0, 1, 1], null)).toBe(false)
  })

  it('returns true when bboxes overlap', () => {
    expect(bboxIntersects([0, 0, 2, 2], [1, 1, 3, 3])).toBe(true)
  })

  it('returns false when bboxes do not overlap', () => {
    expect(bboxIntersects([0, 0, 1, 1], [2, 2, 3, 3])).toBe(false)
  })
})

// ─── getGeometryBbox ──────────────────────────────────────────────────────────

describe('getGeometryBbox', () => {
  it('handles a Point', () => {
    expect(getGeometryBbox({ type: 'Point', coordinates: [10, 20] }))
      .toEqual([10, 20, 10, 20])
  })

  it('handles a LineString', () => {
    expect(getGeometryBbox({ type: 'LineString', coordinates: [[0, 0], [2, 4]] }))
      .toEqual([0, 0, 2, 4])
  })

  it('handles a MultiPoint', () => {
    expect(getGeometryBbox({ type: 'MultiPoint', coordinates: [[1, 2], [3, 4]] }))
      .toEqual([1, 2, 3, 4])
  })

  it('handles a Polygon', () => {
    const ring = [[0, 0], [0, 5], [5, 5], [5, 0], [0, 0]]
    expect(getGeometryBbox({ type: 'Polygon', coordinates: [ring] }))
      .toEqual([0, 0, 5, 5])
  })

  it('handles a MultiLineString', () => {
    expect(getGeometryBbox({
      type: 'MultiLineString',
      coordinates: [[[0, 0], [1, 1]], [[2, 2], [3, 3]]]
    })).toEqual([0, 0, 3, 3])
  })

  it('handles a MultiPolygon', () => {
    const poly1 = [[[0, 0], [0, 2], [2, 2], [2, 0], [0, 0]]]
    const poly2 = [[[3, 3], [3, 5], [5, 5], [5, 3], [3, 3]]]
    expect(getGeometryBbox({ type: 'MultiPolygon', coordinates: [poly1, poly2] }))
      .toEqual([0, 0, 5, 5])
  })

  it('handles a GeometryCollection', () => {
    expect(getGeometryBbox({
      type: 'GeometryCollection',
      geometries: [
        { type: 'Point', coordinates: [1, 2] },
        { type: 'Point', coordinates: [5, 6] }
      ]
    })).toEqual([1, 2, 5, 6])
  })

  it('throws for an unsupported geometry type', () => {
    expect(() => getGeometryBbox({ type: 'Triangle', coordinates: [] }))
      .toThrow('Unsupported geometry type: Triangle')
  })
})
