import { createLiveStroke, requestFrame, cancelFrame } from './liveStroke.js'

const poly = (ring) => ({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [ring] } })

const square = poly([[0, 0], [10, 0], [10, 10], [0, 10]])
const bowtie = poly([[0, 0], [10, 10], [10, 0], [0, 10]])

const setup = () => {
  const onChange = jest.fn()
  const stroke = createLiveStroke({ onChange })
  return { onChange, stroke }
}

beforeEach(() => jest.useFakeTimers())
afterEach(() => jest.useRealTimers())

describe('default rules (synchronous)', () => {
  test('a failing default rule flips dashed immediately with the reason', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, numVertices: 3 })
    expect(onChange).toHaveBeenCalledWith(true, expect.stringMatching(/intersect/i))
  })

  test('going valid again flips back solid', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, numVertices: 3 })
    stroke.update({ feature: square, numVertices: 3 })
    expect(onChange).toHaveBeenLastCalledWith(false, null)
  })

  test('onChange fires only when the state flips, not on every update', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, numVertices: 3 })
    stroke.update({ feature: bowtie, numVertices: 3 })
    stroke.update({ feature: bowtie, numVertices: 3 })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test('below the minimum vertex count the shape is part-drawn — never dashed', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, numVertices: 2 })
    expect(onChange).not.toHaveBeenCalled()
  })

  test('a default-rule failure never invokes the user callback', () => {
    const { stroke } = setup()
    const onGeometryChange = jest.fn()
    stroke.update({ feature: bowtie, numVertices: 3, onGeometryChange })
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled()
  })
})

describe('user callback (throttled)', () => {
  test('runs once per frame with the latest geometry (trailing edge)', () => {
    const { stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, numVertices: 3, onGeometryChange })
    stroke.update({ feature: square, numVertices: 4, onGeometryChange })
    const latest = poly([[0, 0], [20, 0], [20, 20], [0, 20]])
    stroke.update({ feature: latest, numVertices: 5, onGeometryChange })
    expect(onGeometryChange).not.toHaveBeenCalled() // nothing synchronous
    jest.runAllTimers()
    expect(onGeometryChange).toHaveBeenCalledTimes(1)
    expect(onGeometryChange).toHaveBeenCalledWith(expect.objectContaining({ feature: latest, numVertices: 5 }))
  })

  test('a user-callback veto flips dashed with its reason', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: square, numVertices: 3, onGeometryChange: () => ({ valid: false, reason: 'outside region' }) })
    jest.runAllTimers()
    expect(onChange).toHaveBeenCalledWith(true, 'outside region')
  })

  test('a synchronous default failure cancels a pending user-rule frame', () => {
    const { onChange, stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, numVertices: 3, onGeometryChange })
    stroke.update({ feature: bowtie, numVertices: 3, onGeometryChange }) // sync dashed
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled() // stale frame dropped
    expect(onChange).toHaveBeenLastCalledWith(true, expect.any(String))
  })

  test('without a user callback a valid update settles solid immediately', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, numVertices: 3 })
    stroke.update({ feature: square, numVertices: 3 })
    expect(onChange).toHaveBeenLastCalledWith(false, null)
    expect(jest.getTimerCount()).toBe(0)
  })
})

describe('custom validate function', () => {
  test('drives both the synchronous default pass and the throttled user pass', () => {
    const onChange = jest.fn()
    const validate = jest.fn((feature, context, config) =>
      config?.onGeometryChange ? config.onGeometryChange(feature, context) : { valid: true })
    const stroke = createLiveStroke({ onChange, validate })
    const onGeometryChange = jest.fn(() => ({ valid: false, reason: 'vetoed' }))
    stroke.update({ feature: square, numVertices: 3, onGeometryChange })
    expect(validate).toHaveBeenCalledWith(square, expect.objectContaining({ numVertices: 3 }))
    jest.runAllTimers()
    expect(onChange).toHaveBeenCalledWith(true, 'vetoed')
  })
})

describe('requestFrame / cancelFrame (engine-agnostic frame scheduling)', () => {
  test('uses requestAnimationFrame/cancelAnimationFrame when available', () => {
    const raf = jest.spyOn(globalThis, 'requestAnimationFrame')
    const caf = jest.spyOn(globalThis, 'cancelAnimationFrame')
    const cb = jest.fn()
    const id = requestFrame(cb)
    expect(raf).toHaveBeenCalledWith(cb)
    cancelFrame(id)
    expect(caf).toHaveBeenCalledWith(id)
    raf.mockRestore()
    caf.mockRestore()
  })

  test('falls back to setTimeout/clearTimeout when rAF is unavailable (e.g. SSR)', () => {
    const rafDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
    const cafDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame')
    // jsdom defines these as configurable globals — delete rather than assign undefined,
    // so `typeof requestAnimationFrame` genuinely reads 'undefined' inside the module.
    delete globalThis.requestAnimationFrame
    delete globalThis.cancelAnimationFrame
    try {
      const cb = jest.fn()
      requestFrame(cb)
      expect(cb).not.toHaveBeenCalled()
      jest.advanceTimersByTime(16)
      expect(cb).toHaveBeenCalledTimes(1)

      const cb2 = jest.fn()
      const id2 = requestFrame(cb2)
      cancelFrame(id2)
      jest.advanceTimersByTime(16)
      expect(cb2).not.toHaveBeenCalled()
    } finally {
      Object.defineProperty(globalThis, 'requestAnimationFrame', rafDescriptor)
      Object.defineProperty(globalThis, 'cancelAnimationFrame', cafDescriptor)
    }
  })
})

describe('set / reset / destroy', () => {
  test('set() applies through the flip guard and drops any pending frame', () => {
    const { onChange, stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, numVertices: 3, onGeometryChange })
    stroke.set(true, 'committed invalid')
    expect(onChange).toHaveBeenCalledWith(true, 'committed invalid')
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled() // stale live frame dropped
    onChange.mockClear()
    stroke.set(true) // same state — guarded no-op
    expect(onChange).not.toHaveBeenCalled()
  })

  test('set() keeps the cache in sync so the next live update flips correctly', () => {
    const { onChange, stroke } = setup()
    stroke.set(true)
    onChange.mockClear()
    stroke.update({ feature: square, numVertices: 3 }) // valid → back solid
    expect(onChange).toHaveBeenCalledWith(false, null)
  })

  test('refresh() re-asserts the cached state unconditionally (style-reload resync)', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, numVertices: 3 })
    onChange.mockClear()
    stroke.refresh() // rendered output was reset externally — re-apply dashed
    expect(onChange).toHaveBeenCalledWith(true, null)
    stroke.update({ feature: square, numVertices: 3 })
    onChange.mockClear()
    stroke.refresh()
    expect(onChange).toHaveBeenCalledWith(false, null)
  })

  test('destroy() cancels a pending user-rule frame', () => {
    const { stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, numVertices: 3, onGeometryChange })
    stroke.destroy()
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled()
  })

  // Belt-and-braces: runUserRule() re-checks `pending` itself rather than trusting that
  // cancelFrame() actually stopped the callback — simulated here by making
  // cancelAnimationFrame a no-op, so the already-queued frame still fires after
  // cancelPending() has cleared `pending`. The guard must make that a safe no-op rather
  // than reading a null pending's properties.
  test('a frame that still fires despite cancellation is a no-op, guarded by pending being cleared', () => {
    const noopCancel = jest.fn()
    const originalCaf = globalThis.cancelAnimationFrame
    globalThis.cancelAnimationFrame = noopCancel
    try {
      const { onChange, stroke } = setup()
      const onGeometryChange = jest.fn(() => true)
      stroke.update({ feature: square, numVertices: 3, onGeometryChange })
      stroke.destroy() // calls our no-op cancel — the queued frame is NOT actually removed
      expect(noopCancel).toHaveBeenCalled()
      onChange.mockClear()
      expect(() => jest.runAllTimers()).not.toThrow()
      expect(onGeometryChange).not.toHaveBeenCalled() // guard returns before reading pending's fields
      expect(onChange).not.toHaveBeenCalled()
    } finally {
      globalThis.cancelAnimationFrame = originalCaf
    }
  })
})
