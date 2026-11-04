import turfBbox from '@turf/bbox'

// A box is { left, top, right, bottom } in pixels, measured from the same origin as the boxes it's
// compared with.

// [west, south, east, north] from a flat or nested bounds array, or any GeoJSON object
const getFlatBounds = (bounds) => {
  if (Array.isArray(bounds)) {
    return bounds.flat()
  }
  return turfBbox(bounds)
}

/**
 * The on-screen box that bounds a geometry, from its projected corners.
 *
 * @param {[number, number, number, number] | object} bounds - Bounds array or GeoJSON.
 * @param {function([number, number]): { x: number, y: number }} mapToScreen
 * @param {number} [scale] - Multiplies the projected pixels, e.g. to turn map pixels into CSS pixels.
 * @returns {{ left: number, top: number, right: number, bottom: number }}
 */
export const getScreenBox = (bounds, mapToScreen, scale = 1) => {
  const [west, south, east, north] = getFlatBounds(bounds)
  const corners = [[west, south], [west, north], [east, south], [east, north]].map(mapToScreen)
  const xs = corners.map(point => point.x * scale)
  const ys = corners.map(point => point.y * scale)
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) }
}

/**
 * An element's rect as a box relative to another element's rect.
 *
 * @param {DOMRect} rect
 * @param {DOMRect} origin
 * @returns {{ left: number, top: number, right: number, bottom: number }}
 */
export const getRelativeBox = (rect, origin) => ({
  left: rect.left - origin.left,
  top: rect.top - origin.top,
  right: rect.right - origin.left,
  bottom: rect.bottom - origin.top
})

/**
 * The middle of a box.
 *
 * @param {{ left: number, top: number, right: number, bottom: number }} box
 * @returns {[number, number]} `[x, y]`
 */
export const getBoxCenter = (box) => [(box.left + box.right) / 2, (box.top + box.bottom) / 2]

/**
 * Whether `box` lies entirely within `area`. Touching an edge counts as inside.
 *
 * @param {{ left: number, top: number, right: number, bottom: number }} box
 * @param {{ left: number, top: number, right: number, bottom: number }} area
 * @returns {boolean}
 */
export const isInside = (box, area) =>
  box.left >= area.left && box.right <= area.right && box.top >= area.top && box.bottom <= area.bottom

/**
 * Whether two boxes overlap. Boxes that only touch at an edge don't.
 *
 * @param {{ left: number, top: number, right: number, bottom: number }} box
 * @param {{ left: number, top: number, right: number, bottom: number }} area
 * @returns {boolean}
 */
export const isOverlapping = (box, area) =>
  box.left < area.right && box.right > area.left && box.top < area.bottom && box.bottom > area.top
