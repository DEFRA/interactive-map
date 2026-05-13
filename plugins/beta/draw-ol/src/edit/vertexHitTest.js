import { coordToPixel, pixelDist } from '../utils/olCoords.js'

const PIXEL_TOLERANCE = 12

/**
 * Find the nearest vertex to a screen pixel within tolerance.
 *
 * @param {import('ol/Map').default} map
 * @param {number[][]} vertecies - flat coordinate array [[e,n], ...]
 * @param {{ x: number, y: number }} pixel
 * @returns {{ index: number, type: 'vertex' } | null}
 */
export const findNearestVertex = (map, vertecies, pixel) => {
  let bestIdx = -1
  let bestDist = PIXEL_TOLERANCE

  vertecies.forEach((coord, i) => {
    const px = coordToPixel(map, coord)
    if (!px) return
    const d = pixelDist(px, pixel)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  })

  return bestIdx >= 0 ? { index: bestIdx, type: 'vertex' } : null
}

/**
 * Find the nearest midpoint to a screen pixel within tolerance.
 *
 * @param {import('ol/Map').default} map
 * @param {number[][]} midpoints - midpoint coordinate array
 * @param {{ x: number, y: number }} pixel
 * @param {number} vertexCount - number of actual vertices (midpoint index offset)
 * @returns {{ index: number, type: 'midpoint' } | null}
 */
export const findNearestMidpoint = (map, midpoints, pixel, vertexCount) => {
  let bestIdx = -1
  let bestDist = PIXEL_TOLERANCE

  midpoints.forEach((coord, i) => {
    const px = coordToPixel(map, coord)
    if (!px) return
    const d = pixelDist(px, pixel)
    if (d < bestDist) {
      bestDist = d
      bestIdx = i
    }
  })

  return bestIdx >= 0 ? { index: vertexCount + bestIdx, type: 'midpoint' } : null
}

/**
 * Find the nearest vertex or midpoint to a pixel.
 * Vertices take priority when equidistant.
 *
 * @returns {{ index: number, type: 'vertex'|'midpoint' } | null}
 */
export const findNearest = (map, vertecies, midpoints, pixel) => {
  return findNearestVertex(map, vertecies, pixel) ??
    findNearestMidpoint(map, midpoints, pixel, vertecies.length)
}
