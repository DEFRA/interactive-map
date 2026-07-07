import { validateGeometry, validatePlacement } from './validateGeometry.js'

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
    const context = { kind: 'move', vertexIndex: 2, mode: 'edit_vertex' }
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

  test('forces kind "place" into the rule and callback context', () => {
    const onGeometryChange = jest.fn(() => true)
    validatePlacement(simplePath, { mode: 'draw_polygon', vertexIndex: 4 }, { onGeometryChange })
    expect(onGeometryChange).toHaveBeenCalledWith(simplePath, { kind: 'place', mode: 'draw_polygon', vertexIndex: 4 })
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
