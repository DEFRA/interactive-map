import { createLiveStroke } from './liveStroke.js'

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
    stroke.update({ feature: bowtie, placedCount: 3 })
    expect(onChange).toHaveBeenCalledWith(true, expect.stringMatching(/intersect/i))
  })

  test('going valid again flips back solid', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, placedCount: 3 })
    stroke.update({ feature: square, placedCount: 3 })
    expect(onChange).toHaveBeenLastCalledWith(false, null)
  })

  test('onChange fires only when the state flips, not on every update', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, placedCount: 3 })
    stroke.update({ feature: bowtie, placedCount: 3 })
    stroke.update({ feature: bowtie, placedCount: 3 })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test('below the minimum placed count the shape is part-drawn — never dashed', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, placedCount: 2 })
    expect(onChange).not.toHaveBeenCalled()
  })

  test('a default-rule failure never invokes the user callback', () => {
    const { stroke } = setup()
    const onGeometryChange = jest.fn()
    stroke.update({ feature: bowtie, placedCount: 3, onGeometryChange })
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled()
  })
})

describe('user callback (throttled)', () => {
  test('runs once per frame with the latest geometry (trailing edge)', () => {
    const { stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, placedCount: 3, onGeometryChange })
    stroke.update({ feature: square, placedCount: 4, onGeometryChange })
    const latest = poly([[0, 0], [20, 0], [20, 20], [0, 20]])
    stroke.update({ feature: latest, placedCount: 5, onGeometryChange })
    expect(onGeometryChange).not.toHaveBeenCalled() // nothing synchronous
    jest.runAllTimers()
    expect(onGeometryChange).toHaveBeenCalledTimes(1)
    expect(onGeometryChange).toHaveBeenCalledWith(latest, expect.objectContaining({ placedCount: 5 }))
  })

  test('a user-callback veto flips dashed with its reason', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: square, placedCount: 3, onGeometryChange: () => ({ valid: false, reason: 'outside region' }) })
    jest.runAllTimers()
    expect(onChange).toHaveBeenCalledWith(true, 'outside region')
  })

  test('a synchronous default failure cancels a pending user-rule frame', () => {
    const { onChange, stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, placedCount: 3, onGeometryChange })
    stroke.update({ feature: bowtie, placedCount: 3, onGeometryChange }) // sync dashed
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled() // stale frame dropped
    expect(onChange).toHaveBeenLastCalledWith(true, expect.any(String))
  })

  test('without a user callback a valid update settles solid immediately', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, placedCount: 3 })
    stroke.update({ feature: square, placedCount: 3 })
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
    stroke.update({ feature: square, placedCount: 3, onGeometryChange })
    expect(validate).toHaveBeenCalledWith(square, expect.objectContaining({ placedCount: 3 }))
    jest.runAllTimers()
    expect(onChange).toHaveBeenCalledWith(true, 'vetoed')
  })
})

describe('set / reset / destroy', () => {
  test('set() applies through the flip guard and drops any pending frame', () => {
    const { onChange, stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, placedCount: 3, onGeometryChange })
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
    stroke.update({ feature: square, placedCount: 3 }) // valid → back solid
    expect(onChange).toHaveBeenCalledWith(false, null)
  })

  test('reset() clears state without firing onChange', () => {
    const { onChange, stroke } = setup()
    stroke.update({ feature: bowtie, placedCount: 3 })
    onChange.mockClear()
    stroke.reset()
    expect(onChange).not.toHaveBeenCalled()
    stroke.update({ feature: bowtie, placedCount: 3 }) // cache cleared → flips again
    expect(onChange).toHaveBeenCalledWith(true, expect.any(String))
  })

  test('destroy() cancels a pending user-rule frame', () => {
    const { stroke } = setup()
    const onGeometryChange = jest.fn(() => true)
    stroke.update({ feature: square, placedCount: 3, onGeometryChange })
    stroke.destroy()
    jest.runAllTimers()
    expect(onGeometryChange).not.toHaveBeenCalled()
  })
})
