/**
 * Thin helpers bridging OL's array-based pixel/coordinate API
 * and the {x, y} object convention used in touch/keyboard handlers.
 */

/** OL coordinate [e, n] → screen pixel { x, y } */
export const coordToPixel = (map, coord) => {
  const px = map.getPixelFromCoordinate(coord)
  if (!px) { return null }
  return { x: px[0], y: px[1] }
}

/** Screen pixel { x, y } → OL coordinate [e, n] */
export const pixelToCoord = (map, pixel) => {
  return map.getCoordinateFromPixel([pixel.x, pixel.y])
}

/** Pixel distance between two { x, y } points */
export const pixelDist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)

/** OL pixel array [x, y] → { x, y } */
export const arrayToPixel = ([x, y]) => ({ x, y })

/** { x, y } → OL pixel array [x, y] */
export const pixelToArray = ({ x, y }) => [x, y]

/**
 * Nudge a coordinate by (dx, dy) screen pixels.
 * Converts pixel offset to map coordinate delta using the current resolution.
 */
export const nudgeCoord = (map, coord, dx, dy) => {
  const px = map.getPixelFromCoordinate(coord)
  if (!px) { return coord }
  return map.getCoordinateFromPixel([px[0] + dx, px[1] + dy])
}
