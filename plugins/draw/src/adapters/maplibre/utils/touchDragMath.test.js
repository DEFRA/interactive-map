import { getTouchPoint, computeTouchDragAnchors, resolveTouchDragCoord } from './touchDragMath.js'

// Deterministic projection: lngLat <-> pixel is a x10 scale (same convention as the mode
// test harnesses this logic was extracted from).
const project = (p) => {
  const [lng, lat] = Array.isArray(p) ? p : [p.lng, p.lat]
  return { x: lng * 10, y: lat * 10 }
}
const unproject = ({ x, y }) => ({ lng: x / 10, lat: y / 10 })

afterEach(() => {
  document.body.innerHTML = ''
})

describe('getTouchPoint', () => {
  test('reads clientX/clientY off the first touch', () => {
    expect(getTouchPoint({ touches: [{ clientX: 12, clientY: 34 }] })).toEqual({ x: 12, y: 34 })
  })
})

describe('computeTouchDragAnchors', () => {
  test('anchors both the visible target and the map coordinate to the touchstart position', () => {
    const map = { project: jest.fn(project) }
    const targetEl = document.createElement('div')
    document.body.appendChild(targetEl)
    targetEl.style.left = '15px'
    targetEl.style.top = '25px'

    const { deltaTarget, deltaVertex } = computeTouchDragAnchors(map, targetEl, { x: 20, y: 40 }, [5, 5], 1)

    expect(deltaTarget).toEqual({ x: 5, y: 15 }) // touch position minus the target's current CSS position
    expect(deltaVertex).toEqual({ x: -30, y: -10 }) // touch/scale minus the projected coord
    expect(map.project).toHaveBeenCalledWith([5, 5])
  })

  test('divides the touch position by scale before anchoring the coordinate delta', () => {
    const map = { project: jest.fn(project) }
    const targetEl = document.createElement('div')
    document.body.appendChild(targetEl)

    const { deltaVertex } = computeTouchDragAnchors(map, targetEl, { x: 100, y: 100 }, [5, 5], 2)
    expect(deltaVertex).toEqual({ x: 0, y: 0 }) // (100 / 2) - (5 * 10)
  })
})

describe('resolveTouchDragCoord', () => {
  test('unprojects the delta-adjusted touch position when snap is disabled', () => {
    const map = { unproject: jest.fn(unproject) }
    const state = { scale: 1, deltaVertex: { x: 10, y: 10 }, getSnapEnabled: () => false }
    expect(resolveTouchDragCoord(map, state, { x: 30, y: 40 })).toEqual({ lng: 2, lat: 3 })
  })

  test('snaps to a nearby target when active', () => {
    const map = {
      unproject: jest.fn(unproject),
      _snapInstance: { status: true, snapStatus: true, snapCoords: [7, 8], snapToClosestPoint: jest.fn() }
    }
    const state = { scale: 1, deltaVertex: { x: 0, y: 0 }, getSnapEnabled: () => true }
    expect(resolveTouchDragCoord(map, state, { x: 10, y: 10 })).toEqual({ lng: 7, lat: 8 })
  })

  test('falls back to the raw coordinate when snap is enabled but inactive', () => {
    const map = {
      unproject: jest.fn(unproject),
      _snapInstance: { status: true, snapStatus: false, snapCoords: null, snapToClosestPoint: jest.fn() }
    }
    const state = { scale: 1, deltaVertex: { x: 0, y: 0 }, getSnapEnabled: () => true }
    expect(resolveTouchDragCoord(map, state, { x: 10, y: 10 })).toEqual({ lng: 1, lat: 1 })
  })
})
