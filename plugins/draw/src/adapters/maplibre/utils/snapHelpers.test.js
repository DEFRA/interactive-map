import {
  getSnapInstance,
  isSnapActive,
  getSnapLngLat,
  getSnapCoords,
  triggerSnapAtPoint,
  triggerSnapAtCenter,
  clearSnapIndicator,
  clearSnapState,
  getSnapRadius,
  isSnapEnabled,
  createSnappedEvent,
  createSnappedClickEvent
} from './snapHelpers.js'
import { TOLERANCES } from '../../../defaults.js'

const activeSnap = (overrides = {}) => ({
  status: true,
  snapStatus: true,
  snapCoords: [1, 2],
  ...overrides
})

describe('getSnapInstance', () => {
  test('returns the snap instance when present', () => {
    const snap = {}
    expect(getSnapInstance({ _snapInstance: snap })).toBe(snap)
  })

  test('returns null when the map has no instance', () => {
    expect(getSnapInstance({})).toBeNull()
  })

  test('returns null when the map is nullish', () => {
    expect(getSnapInstance(null)).toBeNull()
  })
})

describe('isSnapActive', () => {
  test('returns true when status, snapStatus and >=2 coords are present', () => {
    expect(isSnapActive(activeSnap())).toBe(true)
  })

  test('returns false when snap is nullish', () => {
    expect(isSnapActive(null)).toBe(false)
  })

  test('returns false when status is falsy', () => {
    expect(isSnapActive(activeSnap({ status: false }))).toBe(false)
  })

  test('returns false when snapStatus is falsy', () => {
    expect(isSnapActive(activeSnap({ snapStatus: false }))).toBe(false)
  })

  test('returns false when coords have fewer than 2 entries', () => {
    expect(isSnapActive(activeSnap({ snapCoords: [1] }))).toBe(false)
  })
})

describe('getSnapLngLat', () => {
  test('returns lng/lat object when snap is active', () => {
    expect(getSnapLngLat(activeSnap())).toEqual({ lng: 1, lat: 2 })
  })

  test('returns null when snap is inactive', () => {
    expect(getSnapLngLat(null)).toBeNull()
  })
})

describe('getSnapCoords', () => {
  test('returns [lng, lat] array when snap is active', () => {
    expect(getSnapCoords(activeSnap())).toEqual([1, 2])
  })

  test('returns null when snap is inactive', () => {
    expect(getSnapCoords(null)).toBeNull()
  })
})

describe('triggerSnapAtPoint', () => {
  test('unprojects the point and triggers snap detection', () => {
    const snap = { status: true, snapToClosestPoint: jest.fn() }
    const lngLat = { lng: 5, lat: 6 }
    const map = { unproject: jest.fn(() => lngLat) }
    const point = { x: 10, y: 20 }

    expect(triggerSnapAtPoint(snap, map, point)).toBe(true)
    expect(map.unproject).toHaveBeenCalledWith(point)
    expect(snap.snapToClosestPoint).toHaveBeenCalledWith({ point, lngLat })
  })

  test('returns false when snap is missing', () => {
    expect(triggerSnapAtPoint(null, {}, {})).toBe(false)
  })

  test('returns false when map is missing', () => {
    expect(triggerSnapAtPoint({ status: true }, null, {})).toBe(false)
  })

  test('returns false when snap is disabled', () => {
    expect(triggerSnapAtPoint({ status: false }, {}, {})).toBe(false)
  })
})

describe('triggerSnapAtCenter', () => {
  test('projects the map centre and triggers snap detection', () => {
    const snap = { status: true, snapToClosestPoint: jest.fn() }
    const center = { lng: 1, lat: 2 }
    const point = { x: 3, y: 4 }
    const map = { getCenter: jest.fn(() => center), project: jest.fn(() => point) }

    expect(triggerSnapAtCenter(snap, map)).toBe(true)
    expect(map.project).toHaveBeenCalledWith(center)
    expect(snap.snapToClosestPoint).toHaveBeenCalledWith({ point, lngLat: center })
  })

  test('returns false when snap is missing', () => {
    expect(triggerSnapAtCenter(null, {})).toBe(false)
  })

  test('returns false when map is missing', () => {
    expect(triggerSnapAtCenter({ status: true }, null)).toBe(false)
  })

  test('returns false when snap is disabled', () => {
    expect(triggerSnapAtCenter({ status: false }, {})).toBe(false)
  })
})

describe('clearSnapIndicator', () => {
  test('resets snap state, empties the feature arrays and hides the layer', () => {
    const snap = {
      snapStatus: true,
      snapCoords: [1, 2],
      snappedFeatures: [{}, {}],
      closeFeatures: [{}],
      lines: [{}]
    }
    const map = {
      getLayer: jest.fn(() => ({})),
      setLayoutProperty: jest.fn()
    }

    clearSnapIndicator(snap, map)

    expect(snap.snapStatus).toBe(false)
    expect(snap.snapCoords).toBeNull()
    expect(snap.snappedFeatures).toHaveLength(0)
    expect(snap.closeFeatures).toHaveLength(0)
    expect(snap.lines).toHaveLength(0)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('snap-helper-circle', 'visibility', 'none')
  })

  test('handles a snap with empty/absent arrays and no map', () => {
    const snap = { snapStatus: true, snapCoords: [1, 2] }
    expect(() => clearSnapIndicator(snap)).not.toThrow()
    expect(snap.snapStatus).toBe(false)
    expect(snap.snapCoords).toBeNull()
  })

  test('does not touch the layer when it is absent', () => {
    const map = { getLayer: jest.fn(() => null), setLayoutProperty: jest.fn() }
    clearSnapIndicator(null, map)
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })
})

describe('clearSnapState', () => {
  test('returns early when snap is nullish', () => {
    expect(() => clearSnapState(null)).not.toThrow()
  })

  test('resets snap state and empties the feature arrays', () => {
    const snap = {
      snapStatus: true,
      snapCoords: [1, 2],
      snappedFeatures: [{}, {}],
      closeFeatures: [{}],
      lines: [{}]
    }

    clearSnapState(snap)

    expect(snap.snapStatus).toBe(false)
    expect(snap.snapCoords).toBeNull()
    expect(snap.snappedFeatures).toHaveLength(0)
    expect(snap.closeFeatures).toHaveLength(0)
    expect(snap.lines).toHaveLength(0)
  })

  test('handles a snap with empty/absent arrays', () => {
    const snap = { snapStatus: true, snapCoords: [1, 2] }
    expect(() => clearSnapState(snap)).not.toThrow()
    expect(snap.snapCoords).toBeNull()
  })
})

describe('getSnapRadius', () => {
  test('returns the configured radius', () => {
    expect(getSnapRadius({ options: { radius: 25 } })).toBe(25)
  })

  test('falls back to the configured snap radius when unset', () => {
    expect(getSnapRadius(null)).toBe(TOLERANCES.snapRadius)
  })
})

describe('isSnapEnabled', () => {
  test('returns true when getSnapEnabled returns true', () => {
    expect(isSnapEnabled({ getSnapEnabled: () => true })).toBe(true)
  })

  test('returns false when getSnapEnabled returns a non-true value', () => {
    expect(isSnapEnabled({ getSnapEnabled: () => false })).toBe(false)
  })

  test('returns false when getSnapEnabled is not a function', () => {
    expect(isSnapEnabled({})).toBe(false)
  })
})

describe('createSnappedEvent', () => {
  test('merges the snapped lngLat into the event when snapping', () => {
    const e = { type: 'click', lngLat: { lng: 0, lat: 0 } }
    const result = createSnappedEvent(e, activeSnap())
    expect(result).toEqual({ type: 'click', lngLat: { lng: 1, lat: 2 } })
  })

  test('returns the original event when there is no snap', () => {
    const e = { type: 'click' }
    expect(createSnappedEvent(e, null)).toBe(e)
  })
})

describe('createSnappedClickEvent', () => {
  test('builds a synthetic click event at the snapped point', () => {
    const point = { x: 12, y: 34 }
    const map = { project: jest.fn(() => point) }

    const result = createSnappedClickEvent(map, activeSnap())

    expect(map.project).toHaveBeenCalledWith([1, 2])
    expect(result.lngLat).toEqual({ lng: 1, lat: 2 })
    expect(result.point).toBe(point)
    expect(result.originalEvent).toBeInstanceOf(MouseEvent)
    expect(result.originalEvent.type).toBe('click')
  })

  test('returns null when there is no snap', () => {
    expect(createSnappedClickEvent({}, null)).toBeNull()
  })
})
