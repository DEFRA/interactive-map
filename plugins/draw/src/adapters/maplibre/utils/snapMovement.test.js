import { sharedSnapMovement } from './snapMovement.js'

// Deterministic projection: lngLat <-> pixel is a x10 scale (same convention as the mode
// test harnesses this logic was extracted from).
const project = (p) => {
  const [lng, lat] = Array.isArray(p) ? p : [p.lng, p.lat]
  return { x: lng * 10, y: lat * 10 }
}
const unproject = ({ x, y }) => ({ lng: x / 10, lat: y / 10 })

const makeCtx = (snapOverrides) => ({
  ...sharedSnapMovement,
  map: {
    project: jest.fn(project),
    unproject: jest.fn(unproject),
    getLayer: jest.fn(() => null),
    setLayoutProperty: jest.fn(),
    _snapInstance: snapOverrides
  }
})

describe('getOffset', () => {
  test('applies step/nudge amounts and returns the coord unchanged without an event', () => {
    const ctx = makeCtx()
    const stepped = ctx.getOffset([5, 5], { key: 'ArrowRight', shiftKey: false })
    const nudged = ctx.getOffset([5, 5], { key: 'ArrowRight', shiftKey: true })
    expect(stepped.lng).not.toBe(5)
    expect(Math.abs(nudged.lng - 5)).toBeLessThan(Math.abs(stepped.lng - 5))
    expect(ctx.getOffset([5, 5], null)).toEqual({ lng: 5, lat: 5 })
  })
})

describe('getOffsetByDelta', () => {
  test('applies step/nudge amounts along an explicit direction, mirroring getOffset\'s shiftKey polarity', () => {
    const ctx = makeCtx()
    const large = ctx.getOffsetByDelta([5, 5], 1, 0, true)
    const small = ctx.getOffsetByDelta([5, 5], 1, 0, false)
    expect(large.lng).not.toBe(5)
    expect(Math.abs(small.lng - 5)).toBeLessThan(Math.abs(large.lng - 5))
    expect(ctx.getOffsetByDelta([5, 5], 0, 0, true)).toEqual({ lng: 5, lat: 5 })
  })
})

describe('resolveSnapTarget', () => {
  test('is a no-op passthrough to the candidate coordinate when snap is disabled', () => {
    const ctx = makeCtx()
    const state = { getSnapEnabled: () => false }
    const candidate = { lng: 3, lat: 4 }
    expect(ctx.resolveSnapTarget(state, 1, 0, [0, 0], () => candidate)).toEqual(candidate)
  })

  test('snaps to a nearby target and breaks out of an active snap on the next call', () => {
    const ctx = makeCtx({ status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() })
    const state = { getSnapEnabled: () => true }

    const snapped = ctx.resolveSnapTarget(state, 0, -1, [5, 5], () => ({ lng: 5, lat: 4 }))
    expect(state._isSnapped).toBe(true)
    expect(snapped).toEqual({ lng: 7, lat: 8 })

    // Already snapped → next call breaks out of the snap radius instead of re-snapping
    const escaped = ctx.resolveSnapTarget(state, -1, 0, [7, 8], () => ({ lng: 6, lat: 8 }))
    expect(state._isSnapped).toBe(false)
    expect(escaped.lng).toBeLessThan(7)
  })

  test('falls back to the raw candidate when snap is enabled but inactive', () => {
    const ctx = makeCtx({ status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() })
    const state = { getSnapEnabled: () => true }
    const candidate = { lng: 6, lat: 6 }
    expect(ctx.resolveSnapTarget(state, 1, 0, [5, 5], () => candidate)).toEqual(candidate)
    expect(state._isSnapped).toBe(false)
  })
})
