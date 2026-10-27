import { createCommitChecks, getCommitChecks, isSameGeometry, startCheckSession, SLOW_CHECK_MS } from './commitChecks.js'

const square = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]]] } }
const context = { phase: 'change', mode: 'draw_polygon', vertexIndex: 3 }
const flush = () => Promise.resolve()

describe('createCommitChecks', () => {
  test('starts idle', () => {
    expect(createCommitChecks().state).toEqual(expect.objectContaining({ status: 'idle', revision: 0 }))
  })

  test('settles a passing built-in check straight away when there is no callback', () => {
    const checks = createCommitChecks()
    const sink = jest.fn()
    checks.setSink(sink)
    checks.run({ feature: square, context })
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ status: 'valid', feature: square, context, revision: 1 }))
  })

  test('passes the event and a { signal, revision } second argument to the callback', () => {
    const checks = createCommitChecks()
    const onGeometryChange = jest.fn(() => true)
    checks.run({ feature: square, context, onGeometryChange })
    expect(onGeometryChange).toHaveBeenCalledWith({ feature: square, ...context }, { signal: expect.any(AbortSignal), revision: 1 })
  })

  test('normalises a synchronous result', () => {
    const checks = createCommitChecks()
    checks.run({ feature: square, context, onGeometryChange: () => ({ valid: false, reason: 'too big' }) })
    expect(checks.state).toEqual(expect.objectContaining({ status: 'invalid', result: { valid: false, reason: 'too big', source: 'callback' } }))
  })

  test('goes pending for a Promise, turns slow, then settles with its result', async () => {
    jest.useFakeTimers()
    const checks = createCommitChecks()
    const sink = jest.fn()
    checks.setSink(sink)
    let resolve
    checks.run({ feature: square, context, onGeometryChange: () => new Promise((_resolve) => { resolve = _resolve }) })
    expect(checks.state).toEqual(expect.objectContaining({ status: 'pending', slow: false }))

    jest.advanceTimersByTime(SLOW_CHECK_MS)
    expect(checks.state).toEqual(expect.objectContaining({ status: 'pending', slow: true }))

    resolve(false)
    await flush()
    expect(checks.state).toEqual(expect.objectContaining({ status: 'invalid', afterPending: true }))
    expect(sink.mock.calls.map(([state]) => [state.status, state.slow])).toEqual([['pending', false], ['pending', true], ['invalid', false]])

    // The next check settles straight away, so it doesn't follow a pending state
    checks.run({ feature: square, context, onGeometryChange: () => true })
    expect(checks.state.afterPending).toBe(false)
    jest.useRealTimers()
  })

  test('a quick async reply settles without turning slow', async () => {
    jest.useFakeTimers()
    const checks = createCommitChecks()
    const sink = jest.fn()
    checks.setSink(sink)
    checks.run({ feature: square, context, onGeometryChange: () => Promise.resolve(true) })
    await flush()
    jest.advanceTimersByTime(SLOW_CHECK_MS)
    expect(checks.state).toEqual(expect.objectContaining({ status: 'valid', afterPending: false }))
    expect(sink.mock.calls.map(([state]) => state.status)).toEqual(['pending', 'valid'])
    jest.useRealTimers()
  })

  test('marks a built-in rule failure and a callback error with their source', () => {
    const checks = createCommitChecks()
    const partDrawn = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [0, 0]]] } }
    checks.run({ feature: partDrawn, context })
    expect(checks.state.result.source).toBe('rules')

    jest.spyOn(console, 'warn').mockImplementation(() => {})
    checks.run({ feature: square, context, onGeometryChange: () => { throw new Error('503') } })
    expect(checks.state).toEqual(expect.objectContaining({ status: 'error', result: { valid: false, reason: null, source: 'callback' } }))
    console.warn.mockRestore()
  })

  test('reset aborts the check in flight, drops its reply and returns to idle', async () => {
    const checks = createCommitChecks()
    let resolve
    let signal
    checks.run({ feature: square, context, onGeometryChange: (_event, ctx) => { signal = ctx.signal; return new Promise((_resolve) => { resolve = _resolve }) } })
    checks.reset()
    expect(signal.aborted).toBe(true)

    resolve(true)
    await flush()
    expect(checks.state.status).toBe('idle')
  })

  test('a superseded check that rejects on its aborted signal is dropped silently', async () => {
    const checks = createCommitChecks()
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const onGeometryChange = (_event, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new Error('aborted')))
    })
    checks.run({ feature: square, context, onGeometryChange })
    checks.run({ feature: square, context, onGeometryChange: () => true })
    await flush()
    expect(checks.state.status).toBe('valid')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  test('works without a sink', () => {
    const checks = createCommitChecks()
    expect(() => checks.run({ feature: square, context })).not.toThrow()
  })
})

describe('getCommitChecks', () => {
  test('keeps one controller per draw adapter', () => {
    const drawA = {}
    const drawB = {}
    expect(getCommitChecks(drawA)).toBe(getCommitChecks(drawA))
    expect(getCommitChecks(drawA)).not.toBe(getCommitChecks(drawB))
  })
})

describe('isSameGeometry', () => {
  const ring = (coordinates) => ({ geometry: { type: 'Polygon', coordinates: [coordinates] } })

  test('ignores the closing coordinate of a polygon ring', () => {
    expect(isSameGeometry(ring([[0, 0], [0, 1], [1, 1]]), ring([[0, 0], [0, 1], [1, 1], [0, 0]]))).toBe(true)
  })

  test('tells different shapes apart', () => {
    expect(isSameGeometry(ring([[0, 0], [0, 1], [1, 1]]), ring([[0, 0], [0, 2], [2, 2]]))).toBe(false)
    expect(isSameGeometry(ring([[0, 0], [0, 1], [1, 1]]), { geometry: { type: 'LineString', coordinates: [[0, 0], [0, 1], [1, 1]] } })).toBe(false)
  })

  test('compares lines and points directly', () => {
    const line = { geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } }
    expect(isSameGeometry(line, { geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] } })).toBe(true)
    expect(isSameGeometry({ geometry: { type: 'Point', coordinates: [0, 0] } }, { geometry: { type: 'Point', coordinates: [0, 0] } })).toBe(true)
  })

  test('is false when either side has no geometry', () => {
    expect(isSameGeometry(null, ring([[0, 0]]))).toBe(false)
    expect(isSameGeometry(ring([[0, 0]]), { id: 'x' })).toBe(false)
  })
})

describe('startCheckSession', () => {
  test('prefers per-call callbacks over the plugin-level ones', () => {
    const draw = {}
    const onGeometryChange = jest.fn()
    const onGeometryPreview = jest.fn(() => true)
    startCheckSession(draw, { onGeometryChange, onGeometryPreview }, { onGeometryChange: jest.fn(), onGeometryPreview: jest.fn() })
    expect(draw._commitValidator).toBe(onGeometryChange)
    expect(draw._previewValidator).toBe(onGeometryPreview)
  })

  test('falls back to the plugin-level callbacks', () => {
    const draw = {}
    const onGeometryChange = jest.fn()
    startCheckSession(draw, {}, { onGeometryChange })
    expect(draw._commitValidator).toBe(onGeometryChange)
    expect(draw._previewValidator).toBeUndefined()
  })

  test('ends the previous session’s check', () => {
    const draw = {}
    const checks = getCommitChecks(draw)
    checks.run({ feature: { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] } }, context: { phase: 'edit-start' } })
    expect(checks.state.status).toBe('valid')
    startCheckSession(draw)
    expect(checks.state.status).toBe('idle')
  })
})
