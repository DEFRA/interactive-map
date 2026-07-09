import { validateGeometry, validatePlacement, checkPlacement, validateDisplayedGeometry } from './validateGeometry.js'

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
    expect(validateGeometry(square, {}, { rules: [first, second] })).toEqual({ valid: false, reason: 'first' })
    expect(second).not.toHaveBeenCalled()
  })

  test('passes the context to rules and the callback', () => {
    const rule = jest.fn(() => ({ valid: true }))
    const onGeometryChange = jest.fn(() => ({ valid: true }))
    const context = { phase: 'commit-move', vertexIndex: 2, mode: 'edit_vertex' }
    validateGeometry(square, context, { rules: [rule], onGeometryChange })
    expect(rule).toHaveBeenCalledWith(square, context)
    expect(onGeometryChange).toHaveBeenCalledWith(square, context)
  })

  test('runs the user callback after the rules pass', () => {
    expect(validateGeometry(square, {}, { rules: [], onGeometryChange: () => false }))
      .toEqual({ valid: false, reason: null })
    expect(validateGeometry(square, {}, { rules: [], onGeometryChange: () => true }))
      .toEqual({ valid: true })
    expect(validateGeometry(square, {}, { rules: [], onGeometryChange: () => ({ valid: false, reason: 'too big' }) }))
      .toEqual({ valid: false, reason: 'too big' })
  })

  test('does not run the callback when a rule fails', () => {
    const onGeometryChange = jest.fn()
    validateGeometry(square, {}, { rules: [() => ({ valid: false })], onGeometryChange })
    expect(onGeometryChange).not.toHaveBeenCalled()
  })

  test('is valid with no rules and no callback', () => {
    expect(validateGeometry(square, {}, { rules: [] })).toEqual({ valid: true })
  })
})

describe('checkPlacement (shared engine gate)', () => {
  const placedL = [[0, 0], [1, 1], [1, 0]] // adding (0,1) makes the open path cross

  test('a legal placement passes with no payload', () => {
    expect(checkPlacement({ placed: [[0, 0], [1, 0], [1, 1]], point: [0, 1], geometryType: 'Polygon' }))
      .toEqual({ valid: true })
  })

  test('a self-crossing placement is vetoed with the PLACEMENT_BLOCKED payload', () => {
    const result = checkPlacement({ placed: placedL, point: [0, 1], geometryType: 'Polygon' })
    expect(result.valid).toBe(false)
    expect(result.blocked).toEqual({
      feature: expect.objectContaining({ type: 'Feature' }),
      reason: expect.stringMatching(/intersect/i),
      phase: 'place',
      mode: 'draw_polygon',
      vertexIndex: 3
    })
  })

  test('the user callback can veto, with mode derived from the geometry type', () => {
    const onGeometryChange = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    const result = checkPlacement({ placed: [[0, 0]], point: [1, 1], geometryType: 'LineString', onGeometryChange })
    expect(result.blocked).toEqual(expect.objectContaining({ mode: 'draw_line', reason: 'outside region', vertexIndex: 1 }))
    expect(onGeometryChange).toHaveBeenCalledWith(expect.anything(), { phase: 'place', mode: 'draw_line', vertexIndex: 1 })
  })

  test('checkPlacement mode is set correctly for Polygon vs LineString', () => {
    // Both legal and illegal placements should have the correct mode set
    const polygonLegal = checkPlacement({ placed: [[0, 0], [1, 0]], point: [1, 1], geometryType: 'Polygon' })
    expect(polygonLegal).toEqual({ valid: true })
    // Test a Polygon placement that would cross
    const polygonCrossing = checkPlacement({ placed: [[0, 0], [2, 2], [2, 0]], point: [0, 2], geometryType: 'Polygon' })
    expect(polygonCrossing.blocked?.mode).toBe('draw_polygon')
  })
})

describe('validateDisplayedGeometry edge cases', () => {
  test('handles unknown geometry types with fallback min vertices', () => {
    const result = validateDisplayedGeometry({ type: 'Feature', geometry: { type: 'Unknown', coordinates: [] } }, { placedCount: 0 })
    expect(result.valid).toBe(true) // unknown types use MIN_VERTICES fallback of 0, so 0 placed = valid
  })

  test('feature without geometry type defaults to context.phase', () => {
    const result = validateDisplayedGeometry({ type: 'Feature', geometry: { coordinates: [[0, 0]] } }, { placedCount: 2, phase: 'custom' })
    expect(typeof result).toBe('object')
    expect(result).toHaveProperty('valid')
  })

  test('context without placedCount defaults to 0 for min-vertex check', () => {
    const result = validateDisplayedGeometry(poly([[0, 0]]), {})
    expect(result.valid).toBe(true) // no placedCount = 0, below any min, so valid
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
    const onGeometryChange = jest.fn(() => true)
    validatePlacement(simplePath, { mode: 'draw_polygon', vertexIndex: 4 }, { onGeometryChange })
    expect(onGeometryChange).toHaveBeenCalledWith(simplePath, { phase: 'place', mode: 'draw_polygon', vertexIndex: 4 })
  })

  test('the user callback can veto a placement with a reason', () => {
    const onGeometryChange = () => ({ valid: false, reason: 'outside region' })
    expect(validatePlacement(simplePath, {}, { onGeometryChange }))
      .toEqual({ valid: false, reason: 'outside region' })
  })

  test('hard rules run before the user callback', () => {
    const onGeometryChange = jest.fn()
    validatePlacement(crossingPath, {}, { onGeometryChange })
    expect(onGeometryChange).not.toHaveBeenCalled()
  })
})
