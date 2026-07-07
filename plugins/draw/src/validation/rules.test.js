import { noSelfIntersection, nonZeroArea, minVertices, pathSelfIntersects, noPathSelfIntersection, SOFT_RULES, HARD_RULES } from './rules.js'

const poly = (coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] } })
const line = (coordinates) => ({ type: 'Feature', geometry: { type: 'LineString', coordinates } })

describe('noSelfIntersection', () => {
  test('rejects a closed self-intersecting polygon', () => {
    expect(noSelfIntersection(poly([[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]])).valid).toBe(false)
  })

  test('rejects a shape whose closing edge crosses another edge', () => {
    expect(noSelfIntersection(poly([[0, 0], [2, 0], [0, 2], [2, 2]])).valid).toBe(false)
  })

  test('detects a T-touch (collinear) crossing', () => {
    // Edge (1,0)-(1,2) starts on the earlier edge (0,0)-(3,0): a collinear/touch hit.
    expect(noSelfIntersection(poly([[0, 0], [3, 0], [1, 0], [1, 2]])).valid).toBe(false)
  })

  test('accepts a simple polygon', () => {
    expect(noSelfIntersection(poly([[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]))).toEqual({ valid: true })
  })

  test('skips non-polygons and short rings', () => {
    expect(noSelfIntersection(line([[0, 0], [1, 1]]))).toEqual({ valid: true })
    expect(noSelfIntersection(poly([[0, 0], [1, 1], [1, 0]]))).toEqual({ valid: true })
  })
})

describe('nonZeroArea (soft)', () => {
  test('rejects a collinear (zero-area) ring', () => {
    const result = nonZeroArea(poly([[0, 0], [1, 0], [2, 0]]))
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/area/i)
  })

  test('accepts a ring with area', () => {
    expect(nonZeroArea(poly([[0, 0], [1, 0], [1, 1]]))).toEqual({ valid: true })
  })

  test('skips non-polygons and rings under three vertices', () => {
    expect(nonZeroArea(line([[0, 0], [1, 1]]))).toEqual({ valid: true })
    expect(nonZeroArea(poly([[0, 0], [1, 0]]))).toEqual({ valid: true })
  })
  // The defensive catch (a turf failure → skip) is covered in rules.areaError.test.js,
  // which needs a file-level @turf/area mock that must not affect the real-area tests here.
})

describe('minVertices (soft)', () => {
  test('requires three points for a polygon', () => {
    expect(minVertices(poly([[0, 0], [1, 0]])).valid).toBe(false)
    expect(minVertices(poly([[0, 0], [1, 0], [1, 1]]))).toEqual({ valid: true })
  })

  test('counts a closed ring by its distinct vertices', () => {
    expect(minVertices(poly([[0, 0], [1, 0], [1, 1], [0, 0]]))).toEqual({ valid: true })
  })

  test('requires two points for a line', () => {
    expect(minVertices(line([[0, 0]])).valid).toBe(false)
    expect(minVertices(line([[0, 0], [1, 1]]))).toEqual({ valid: true })
  })

  test('skips geometry that is neither a polygon nor a line', () => {
    expect(minVertices({ geometry: { type: 'Point', coordinates: [0, 0] } })).toEqual({ valid: true })
  })
})

describe('pathSelfIntersects (hard, draw placement)', () => {
  test('detects a self-crossing open drawn path (no closing edge)', () => {
    expect(pathSelfIntersects(poly([[0, 0], [2, 2], [2, 0], [0, 2]]))).toBe(true)
  })

  test('accepts an open path that only closes into a crossing', () => {
    // A bow-tie only crosses via its closing edge, which the open-path check ignores.
    expect(pathSelfIntersects(poly([[0, 0], [2, 0], [0, 2], [2, 2]]))).toBe(false)
  })

  test('accepts a simple open path', () => {
    expect(pathSelfIntersects(poly([[0, 0], [2, 0], [2, 2], [0, 2]]))).toBe(false)
  })

  test('skips non-polygons and paths under four vertices', () => {
    expect(pathSelfIntersects(line([[0, 0], [1, 1]]))).toBe(false)
    expect(pathSelfIntersects(poly([[0, 0], [1, 0], [1, 1]]))).toBe(false)
  })
})

describe('consecutive duplicate vertices (zero-length edges)', () => {
  test('a rubber band sitting on the just-placed vertex is not an intersection', () => {
    // 3 placed + duplicate rubber-band coord + closing point — the in-progress
    // ring layout the instant after a vertex is placed.
    expect(noSelfIntersection(poly([[0, 0], [10, 0], [10, 10], [10, 10], [0, 0]])))
      .toEqual({ valid: true })
  })

  test('a real crossing is still detected when a duplicate vertex is present', () => {
    expect(noSelfIntersection(poly([[0, 0], [1, 1], [1, 1], [1, 0], [0, 1], [0, 0]])).valid).toBe(false)
  })
})

describe('noPathSelfIntersection (hard, rule shape)', () => {
  test('wraps pathSelfIntersects with a reason for the placement veto', () => {
    expect(noPathSelfIntersection(poly([[0, 0], [2, 2], [2, 0], [0, 2]])))
      .toEqual({ valid: false, reason: expect.stringMatching(/intersect/i) })
    expect(noPathSelfIntersection(poly([[0, 0], [2, 0], [2, 2], [0, 2]]))).toEqual({ valid: true })
  })
})

describe('SOFT_RULES', () => {
  test('are the gating rules in reason-priority order', () => {
    expect(SOFT_RULES).toEqual([noSelfIntersection, nonZeroArea, minVertices])
  })
})

describe('HARD_RULES', () => {
  test('are the placement-veto rules', () => {
    expect(HARD_RULES).toEqual([noPathSelfIntersection])
  })
})
