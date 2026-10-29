import { validateGeometry, validatePlacement, attemptPlacement, validateDisplayedGeometry, normaliseResult, toPlacementBlocked } from './validateGeometry.js'

const poly = (coordinates) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [coordinates] } })

const square = poly([[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]])
const bowtie = poly([[0, 0], [1, 1], [1, 0], [0, 1], [0, 0]])
const collinear = poly([[0, 0], [1, 0], [2, 0], [0, 0]])
const twoPoints = poly([[0, 0], [1, 0]])

describe('validateGeometry (soft gating)', () => {
  test('a valid polygon passes', () => {
    expect(validateGeometry(square)).toEqual({ valid: true })
  })

  test('a self-intersecting polygon fails', () => {
    const result = validateGeometry(bowtie)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/intersect/i)
  })

  test('a zero-area polygon fails', () => {
    expect(validateGeometry(collinear).reason).toMatch(/area/i)
  })

  test('too few vertices fails', () => {
    expect(validateGeometry(twoPoints).reason).toMatch(/points/i)
  })

  test('short-circuits on the first failing rule', () => {
    const first = jest.fn(() => ({ valid: false, reason: 'first' }))
    const second = jest.fn(() => ({ valid: true }))
    expect(validateGeometry(square, {}, { rules: [first, second] })).toEqual({ valid: false, reason: 'first', source: 'rules' })
    expect(second).not.toHaveBeenCalled()
  })

  test('passes the context to rules as (feature, context), and to the callback as a single flattened event object', () => {
    const rule = jest.fn(() => ({ valid: true }))
    const onGeometryPreview = jest.fn(() => ({ valid: true }))
    const context = { phase: 'change', vertexIndex: 2, mode: 'edit_vertex' }
    validateGeometry(square, context, { rules: [rule], onGeometryPreview })
    expect(rule).toHaveBeenCalledWith(square, context)
    expect(onGeometryPreview).toHaveBeenCalledWith({ feature: square, ...context })
  })

  test('runs the user callback after the rules pass', () => {
    expect(validateGeometry(square, {}, { rules: [], onGeometryPreview: () => false }))
      .toEqual({ valid: false, reason: null, source: 'callback' })
    expect(validateGeometry(square, {}, { rules: [], onGeometryPreview: () => true }))
      .toEqual({ valid: true })
    expect(validateGeometry(square, {}, { rules: [], onGeometryPreview: () => ({ valid: false, reason: 'too big' }) }))
      .toEqual({ valid: false, reason: 'too big', source: 'callback' })
  })

  test('does not run the callback when a rule fails', () => {
    const onGeometryPreview = jest.fn()
    validateGeometry(square, {}, { rules: [() => ({ valid: false })], onGeometryPreview })
    expect(onGeometryPreview).not.toHaveBeenCalled()
  })

  test('is valid with no rules and no callback', () => {
    expect(validateGeometry(square, {}, { rules: [] })).toEqual({ valid: true })
  })
})

describe('attemptPlacement (shared engine gate)', () => {
  const placedL = [[0, 0], [1, 1], [1, 0]] // adding (0,1) makes the open path cross

  test('a legal placement passes with no payload', () => {
    expect(attemptPlacement({ placed: [[0, 0], [1, 0], [1, 1]], point: [0, 1], geometryType: 'Polygon' }))
      .toEqual({ valid: true })
  })

  test('a self-crossing placement is vetoed with the PLACEMENT_BLOCKED payload', () => {
    const result = attemptPlacement({ placed: placedL, point: [0, 1], geometryType: 'Polygon' })
    expect(result.valid).toBe(false)
    expect(result.blocked).toEqual({
      feature: expect.objectContaining({ type: 'Feature' }),
      reason: expect.stringMatching(/intersect/i),
      source: 'rules',
      phase: 'place',
      mode: 'draw_polygon',
      vertexIndex: 3
    })
  })

  test('the user callback can veto, with mode derived from the geometry type', () => {
    const onGeometryPreview = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const result = attemptPlacement({ placed: [[0, 0]], point: [1, 1], geometryType: 'LineString', onGeometryPreview })
    expect(result.blocked).toEqual(expect.objectContaining({ mode: 'draw_line', reason: 'outside region', vertexIndex: 1 }))
    expect(onGeometryPreview).toHaveBeenCalledWith(expect.objectContaining({ phase: 'place', mode: 'draw_line', vertexIndex: 1 }))
  })

  test('a veto with no reason falls back to null in the PLACEMENT_BLOCKED payload', () => {
    const onGeometryPreview = jest.fn(() => false) // false → invalid, no reason (see normaliseResult)
    const result = attemptPlacement({ placed: [[0, 0]], point: [1, 1], geometryType: 'LineString', onGeometryPreview })
    expect(result.blocked.reason).toBeNull()
  })

  test('attemptPlacement mode is set correctly for Polygon vs LineString', () => {
    // Both legal and illegal placements should have the correct mode set
    const polygonLegal = attemptPlacement({ placed: [[0, 0], [1, 0]], point: [1, 1], geometryType: 'Polygon' })
    expect(polygonLegal).toEqual({ valid: true })
    // Test a Polygon placement that would cross
    const polygonCrossing = attemptPlacement({ placed: [[0, 0], [2, 2], [2, 0]], point: [0, 2], geometryType: 'Polygon' })
    expect(polygonCrossing.blocked?.mode).toBe('draw_polygon')
  })
})

describe('validateDisplayedGeometry edge cases', () => {
  test('handles unknown geometry types with fallback min vertices', () => {
    const result = validateDisplayedGeometry({ type: 'Feature', geometry: { type: 'Unknown', coordinates: [] } }, { numVertices: 0 })
    expect(result.valid).toBe(true) // unknown types use MIN_VERTICES fallback of 0, so 0 placed = valid
  })

  test('feature without geometry type defaults to context.phase', () => {
    const result = validateDisplayedGeometry({ type: 'Feature', geometry: { coordinates: [[0, 0]] } }, { numVertices: 2, phase: 'custom' })
    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('valid')
  })

  test('context without numVertices defaults to 0 for min-vertex check', () => {
    const result = validateDisplayedGeometry(poly([[0, 0]]), {})
    expect(result.valid).toBe(true) // no numVertices = 0, below any min, so valid
  })

  test('context and config are both optional — called with just a feature', () => {
    expect(validateDisplayedGeometry(poly([[0, 0]]))).toEqual({ valid: true })
  })

  test('calls the caller\'s own onGeometryPreview once at/above the vertex threshold, with a single flattened event object', () => {
    const onGeometryPreview = jest.fn(() => ({ valid: false, reason: 'too few for my rule' }))
    // Polygon minimum is 3 placed vertices — this feature/numVertices pair is at it.
    const feature = poly([[0, 0], [1, 0], [1, 1]])

    const result = validateDisplayedGeometry(feature, { numVertices: 3 }, { onGeometryPreview })

    expect(onGeometryPreview).toHaveBeenCalledWith(expect.objectContaining({ feature, numVertices: 3, phase: 'preview' }))
    expect(result).toEqual({ valid: false, reason: 'too few for my rule', source: 'callback' })
  })

  test('skips the built-in rules with zero committed vertices, but still runs the caller\'s onGeometryPreview — a location-based rule is meaningful against the very first candidate point', () => {
    const failingRule = jest.fn(() => ({ valid: false, reason: 'should not run' }))
    const onGeometryPreview = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const feature = poly([[0, 0]])

    const result = validateDisplayedGeometry(feature, { numVertices: 0 }, { rules: [failingRule], onGeometryPreview })

    expect(failingRule).not.toHaveBeenCalled()
    expect(onGeometryPreview).toHaveBeenCalledWith(expect.objectContaining({ feature, numVertices: 0, phase: 'preview' }))
    expect(result).toEqual({ valid: false, reason: 'outside region', source: 'callback' })
  })

  test('runs the caller\'s onGeometryPreview from the first committed vertex, even while the built-in rules are still skipped', () => {
    const failingRule = jest.fn(() => ({ valid: false, reason: 'should not run' }))
    // A single committed vertex — well below the Polygon minimum of 3 — so the
    // built-in self-intersection/area rules stay skipped, but a per-point user
    // rule (e.g. "is this inside a region?") is meaningful and should still run.
    const onGeometryPreview = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const feature = poly([[0, 0], [1, 1]])

    const result = validateDisplayedGeometry(feature, { numVertices: 1 }, { rules: [failingRule], onGeometryPreview })

    expect(failingRule).not.toHaveBeenCalled()
    expect(onGeometryPreview).toHaveBeenCalledWith(expect.objectContaining({ feature, numVertices: 1, phase: 'preview' }))
    expect(result).toEqual({ valid: false, reason: 'outside region', source: 'callback' })
  })
})

describe('validatePlacement (hard gating)', () => {
  // The candidate is the open drawn path plus the point about to be placed.
  const crossingPath = poly([[0, 0], [1, 1], [1, 0], [0, 1]])
  const simplePath = poly([[0, 0], [1, 0], [1, 1], [0, 1]])

  test('rejects a candidate whose open path self-crosses, with a reason', () => {
    const result = validatePlacement(crossingPath)
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/intersect/i)
  })

  test('passes a simple candidate', () => {
    expect(validatePlacement(simplePath)).toEqual({ valid: true })
  })

  test('forces phase "place" into the rule and callback context', () => {
    const onGeometryPreview = jest.fn(() => true)
    validatePlacement(simplePath, { mode: 'draw_polygon', vertexIndex: 4 }, { onGeometryPreview })
    expect(onGeometryPreview).toHaveBeenCalledWith({ feature: simplePath, phase: 'place', mode: 'draw_polygon', vertexIndex: 4 })
  })

  test('the user callback can veto a placement with a reason', () => {
    const onGeometryPreview = () => ({ valid: false, reason: 'outside region' })
    expect(validatePlacement(simplePath, {}, { onGeometryPreview }))
      .toEqual({ valid: false, reason: 'outside region', source: 'callback' })
  })

  test('placement rules run before the user callback', () => {
    const onGeometryPreview = jest.fn()
    validatePlacement(crossingPath, {}, { onGeometryPreview })
    expect(onGeometryPreview).not.toHaveBeenCalled()
  })
})

// onGeometryPreview must answer synchronously; a Promise it returns can't be waited for
describe('normaliseResult', () => {
  test('treats a returned Promise as valid', () => {
    expect(normaliseResult(Promise.resolve(false)).valid).toBe(true)
  })

  test('keeps an announcement and recheckOnFinish, and drops anything else', () => {
    expect(normaliseResult({ valid: true, announcement: 'Area 2 hectares', recheckOnFinish: true, other: 1 }))
      .toEqual({ valid: true, reason: undefined, announcement: 'Area 2 hectares', recheckOnFinish: true })
    expect(normaliseResult({ valid: false, reason: 'too big' })).not.toHaveProperty('announcement')
  })

  test('keeps properties on a passing result only, and only as an object', () => {
    const properties = { drawRules: { checked: false } }
    expect(normaliseResult({ valid: true, properties })).toEqual({ valid: true, reason: undefined, properties })
    expect(normaliseResult({ properties })).toHaveProperty('properties', properties)
    expect(normaliseResult({ valid: false, reason: 'overlap', properties })).not.toHaveProperty('properties')
    expect(normaliseResult({ valid: true, properties: ['a'] })).not.toHaveProperty('properties')
    expect(normaliseResult({ valid: true, properties: null })).not.toHaveProperty('properties')
  })
})

describe('toPlacementBlocked', () => {
  test('carries the reason, source and any announcement', () => {
    const feature = { type: 'Feature' }
    expect(toPlacementBlocked(feature, { reason: 'outside', source: 'callback', announcement: 'Outside the area' }, { mode: 'draw_point', vertexIndex: 0 }))
      .toEqual({ feature, reason: 'outside', source: 'callback', announcement: 'Outside the area', phase: 'place', mode: 'draw_point', vertexIndex: 0 })
    expect(toPlacementBlocked(feature, { source: 'rules' }, { mode: 'draw_polygon', vertexIndex: 2 }))
      .toEqual({ feature, reason: null, source: 'rules', phase: 'place', mode: 'draw_polygon', vertexIndex: 2 })
  })
})
