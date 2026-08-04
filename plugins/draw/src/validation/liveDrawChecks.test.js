import { createLiveDrawChecks } from './liveDrawChecks.js'

const poly = (ring) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } })

// Closed-ring self-intersect only (LIVE_RULES fails, HARD_RULES/open-path passes) —
// only the implicit closing edge crosses.
const closingEdgeCrosses = poly([[0, 0], [2, 0], [0, 2], [2, 2]])
// Open-path self-intersect (HARD_RULES fails) — also fails LIVE_RULES, since a
// crossing open path implies a crossing closed one too.
const openPathCrosses = poly([[0, 0], [2, 2], [2, 0], [0, 2]])
const square = poly([[0, 0], [10, 0], [10, 10], [0, 10]])

const setup = () => {
  const onStrokeChange = jest.fn()
  const onPlaceChange = jest.fn()
  const checks = createLiveDrawChecks({ onStrokeChange, onPlaceChange })
  return { onStrokeChange, onPlaceChange, checks }
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('built-in rules (synchronous, independently floored, flip-guarded)', () => {
  test('LIVE_RULES (closed ring) gates the stroke; HARD_RULES (open path) gates placement — independently', () => {
    const { onStrokeChange, onPlaceChange, checks } = setup()
    checks.update({ feature: closingEdgeCrosses, numVertices: 3 })
    expect(onStrokeChange).toHaveBeenCalledWith(true, expect.any(String)) // dashed
    expect(onPlaceChange).not.toHaveBeenCalled() // still placeable — never flipped from its valid default
  })

  test('an open-path crossing vetoes placement too, since it also crosses closed', () => {
    const { onStrokeChange, onPlaceChange, checks } = setup()
    checks.update({ feature: openPathCrosses, numVertices: 3 })
    expect(onStrokeChange).toHaveBeenCalledWith(true, expect.any(String))
    expect(onPlaceChange).toHaveBeenCalledWith(true, expect.any(String))
  })

  test('a valid shape leaves both gates open, and flips them back once they were invalid', () => {
    const { onStrokeChange, onPlaceChange, checks } = setup()
    checks.update({ feature: openPathCrosses, numVertices: 3 }) // both invalid first
    checks.update({ feature: square, numVertices: 3 }) // valid again — should flip back
    expect(onStrokeChange).toHaveBeenLastCalledWith(false, null)
    expect(onPlaceChange).toHaveBeenLastCalledWith(false, null)
  })

  test('LIVE_RULES stays floored below the minimum vertex count — never flips at all', () => {
    const { onStrokeChange, checks } = setup()
    checks.update({ feature: closingEdgeCrosses, numVertices: 1 })
    expect(onStrokeChange).not.toHaveBeenCalled()
  })

  test('numVertices defaults to 0 when omitted from context', () => {
    const { onStrokeChange, checks } = setup()
    checks.update({ feature: closingEdgeCrosses })
    expect(onStrokeChange).not.toHaveBeenCalled() // treated as 0 — below the floor
  })

  test('HARD_RULES is never floored — it must protect placing an invalid first vertex', () => {
    const { onPlaceChange, checks } = setup()
    // A single point can never self-intersect, so this stays placeable — the
    // point is that placement is EVALUATED (not skipped) even at numVertices 0,
    // proven by the user-callback tests below where a custom veto DOES apply here.
    checks.update({ feature: poly([[0, 0]]), numVertices: 0 })
    expect(onPlaceChange).not.toHaveBeenCalled() // stayed valid — no flip to report
  })
})

describe('user callback (throttled, single call drives both gates)', () => {
  test('runs ONCE per frame with phase preview, not once per gate', () => {
    const { checks } = setup()
    const onGeometryChange = jest.fn(() => true)
    checks.update({ feature: square, numVertices: 3, onGeometryChange })
    expect(onGeometryChange).not.toHaveBeenCalled() // deferred to the frame
    jest.runAllTimers()
    expect(onGeometryChange).toHaveBeenCalledTimes(1)
    expect(onGeometryChange).toHaveBeenCalledWith(expect.objectContaining({ feature: square, numVertices: 3, phase: 'preview' }))
  })

  test('a veto flips BOTH the stroke and placement gates from the one call', () => {
    const { onStrokeChange, onPlaceChange, checks } = setup()
    const onGeometryChange = () => ({ valid: false, reason: 'outside region' })
    checks.update({ feature: square, numVertices: 3, onGeometryChange })
    jest.runAllTimers()
    expect(onStrokeChange).toHaveBeenLastCalledWith(true, 'outside region')
    expect(onPlaceChange).toHaveBeenLastCalledWith(true, 'outside region')
  })

  test('runs even with zero committed vertices — a location-based rule is meaningful against the first candidate point', () => {
    const { onPlaceChange, checks } = setup()
    const onGeometryChange = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    checks.update({ feature: poly([[0, 0]]), numVertices: 0, onGeometryChange })
    jest.runAllTimers()
    expect(onGeometryChange).toHaveBeenCalledWith(expect.objectContaining({ numVertices: 0, phase: 'preview' }))
    expect(onPlaceChange).toHaveBeenLastCalledWith(true, 'outside region')
  })

  test('a built-in HARD_RULES failure still applies even when the user callback passes', () => {
    const { onPlaceChange, checks } = setup()
    const onGeometryChange = jest.fn(() => true)
    checks.update({ feature: openPathCrosses, numVertices: 3, onGeometryChange })
    jest.runAllTimers()
    expect(onPlaceChange).toHaveBeenLastCalledWith(true, expect.any(String))
  })

  test('runs once per frame using the latest geometry (trailing edge)', () => {
    const { checks } = setup()
    const onGeometryChange = jest.fn(() => true)
    checks.update({ feature: square, numVertices: 3, onGeometryChange })
    checks.update({ feature: square, numVertices: 4, onGeometryChange })
    const latest = poly([[0, 0], [20, 0], [20, 20], [0, 20]])
    checks.update({ feature: latest, numVertices: 5, onGeometryChange })
    jest.runAllTimers()
    expect(onGeometryChange).toHaveBeenCalledTimes(1)
    expect(onGeometryChange).toHaveBeenCalledWith(expect.objectContaining({ feature: latest, numVertices: 5 }))
  })
})

describe('flip guard', () => {
  test('each gate fires only when its own state flips, not on every update', () => {
    const { onStrokeChange, onPlaceChange, checks } = setup()
    checks.update({ feature: openPathCrosses, numVertices: 3 })
    checks.update({ feature: openPathCrosses, numVertices: 3 })
    checks.update({ feature: openPathCrosses, numVertices: 3 })
    expect(onStrokeChange).toHaveBeenCalledTimes(1)
    expect(onPlaceChange).toHaveBeenCalledTimes(1)
  })

  test('reset() is a no-op for a gate that was never invalid', () => {
    const { onStrokeChange, onPlaceChange, checks } = setup()
    checks.update({ feature: square, numVertices: 3 }) // valid — neither gate ever flips
    checks.reset()
    expect(onStrokeChange).not.toHaveBeenCalled()
    expect(onPlaceChange).not.toHaveBeenCalled()
  })
})

describe('reset / destroy', () => {
  test('reset() clears the cached custom verdict and drops a pending frame', () => {
    const { onStrokeChange, checks } = setup()
    const onGeometryChange = jest.fn(() => ({ valid: false, reason: 'outside region' }))
    checks.update({ feature: square, numVertices: 3, onGeometryChange })
    jest.runAllTimers()
    expect(onStrokeChange).toHaveBeenLastCalledWith(true, 'outside region')

    checks.reset()
    onGeometryChange.mockClear()
    checks.update({ feature: square, numVertices: 3 }) // fresh session, no callback this time
    expect(onStrokeChange).toHaveBeenLastCalledWith(false, null)
  })

  test('destroy() cancels a pending user-rule frame', () => {
    const { checks } = setup()
    const onGeometryChange = jest.fn(() => true)
    checks.update({ feature: square, numVertices: 3, onGeometryChange })
    checks.destroy()
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled()
  })
})
