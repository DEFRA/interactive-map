/**
 * Snap helper utilities for draw modes
 * Provides a consistent interface for snap detection and coordinate retrieval
 */

/**
 * Get the snap instance from the map
 * @param {maplibregl.Map} map - Map instance
 * @returns {MapboxSnap|null} Snap instance or null
 */
export function getSnapInstance(map) {
  return map?._snapInstance ?? null
}

/**
 * Check if snapping is currently active
 * @param {MapboxSnap} snap - Snap instance
 * @returns {boolean} True if snap is active with valid coordinates
 */
export function isSnapActive(snap) {
  return !!(snap?.snapStatus && snap.snapCoords?.length >= 2)
}

/**
 * Get snapped coordinates as lngLat object
 * @param {MapboxSnap} snap - Snap instance
 * @returns {{ lng: number, lat: number }|null} Snapped coordinates or null
 */
export function getSnapLngLat(snap) {
  if (!isSnapActive(snap)) return null
  return {
    lng: snap.snapCoords[0],
    lat: snap.snapCoords[1]
  }
}

/**
 * Get snapped coordinates as array [lng, lat]
 * @param {MapboxSnap} snap - Snap instance
 * @returns {[number, number]|null} Snapped coordinates or null
 */
export function getSnapCoords(snap) {
  if (!isSnapActive(snap)) return null
  return [snap.snapCoords[0], snap.snapCoords[1]]
}

/**
 * Trigger snap detection at a given point
 * @param {MapboxSnap} snap - Snap instance
 * @param {maplibregl.Map} map - Map instance
 * @param {{ x: number, y: number }} point - Screen point
 * @returns {boolean} True if snap was triggered
 */
export function triggerSnapAtPoint(snap, map, point) {
  if (!snap || !map) return false

  const lngLat = map.unproject(point)
  snap.snapToClosestPoint({ point, lngLat })
  return true
}

/**
 * Trigger snap detection at map center (for touch/keyboard modes)
 * @param {MapboxSnap} snap - Snap instance
 * @param {maplibregl.Map} map - Map instance
 * @returns {boolean} True if snap was triggered
 */
export function triggerSnapAtCenter(snap, map) {
  if (!snap || !map) return false

  const center = map.getCenter()
  const point = map.project(center)
  snap.snapToClosestPoint({ point, lngLat: center })
  return true
}

/**
 * Clear the snap indicator circle
 * @param {MapboxSnap} snap - Snap instance
 */
export function clearSnapIndicator(snap) {
  if (!snap) return

  snap.snapStatus = false
  snap.setMapData({ type: 'FeatureCollection', features: [] })
}

/**
 * Get snap radius in pixels
 * @param {MapboxSnap} snap - Snap instance
 * @returns {number} Snap radius in pixels (default 15)
 */
export function getSnapRadius(snap) {
  return snap?.options?.radius ?? 15
}

/**
 * Check if snapping is enabled for a given state
 * @param {object} state - Mode state
 * @returns {boolean} True if snapping is enabled
 */
export function isSnapEnabled(state) {
  return state?.enableSnap !== false
}

/**
 * Create a synthetic map event with snapped coordinates
 * @param {object} e - Original event
 * @param {MapboxSnap} snap - Snap instance
 * @returns {object} Event with snapped lngLat or original event
 */
export function createSnappedEvent(e, snap) {
  const lngLat = getSnapLngLat(snap)
  if (!lngLat) return e

  return {
    ...e,
    lngLat
  }
}

/**
 * Create a synthetic click event at snapped coordinates
 * @param {maplibregl.Map} map - Map instance
 * @param {MapboxSnap} snap - Snap instance
 * @returns {object|null} Synthetic event or null if no snap
 */
export function createSnappedClickEvent(map, snap) {
  const lngLat = getSnapLngLat(snap)
  if (!lngLat) return null

  const point = map.project([lngLat.lng, lngLat.lat])
  return {
    lngLat,
    point,
    originalEvent: new MouseEvent('click', {
      clientX: point.x,
      clientY: point.y,
      bubbles: true,
      cancelable: true
    })
  }
}
