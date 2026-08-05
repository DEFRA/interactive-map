import { coordToPixel, pixelDist } from '../utils/olCoords.js'

// Also used as the Modify interaction's pixelTolerance so pointer hit
// detection and OL's drag activation agree on what "on a handle" means
export const PIXEL_TOLERANCE = 12

/**
 * Find the nearest vertex to a screen pixel within tolerance.
 *
 * @param {import('ol/Map').default} map
 * @param {number[][]} vertices - flat coordinate array [[e,n], ...]
 * @param {{ x: number, y: number }} pixel
 * @param {number} [tolerance]
 * @returns {{ index: number, type: 'vertex' } | null}
 */
export const findNearestVertex = (map, vertices, pixel, tolerance = PIXEL_TOLERANCE) => {
  let bestIdx = -1
  let bestDist = tolerance

  vertices.forEach((coord, i) => {
    const px = coordToPixel(map, coord)
    if (!px) {
      return
    }
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
 * @param {number} [tolerance]
 * @returns {{ index: number, type: 'midpoint' } | null}
 */
export const findNearestMidpoint = (map, midpoints, pixel, vertexCount, tolerance = PIXEL_TOLERANCE) => {
  let bestIdx = -1
  let bestDist = tolerance

  midpoints.forEach((coord, i) => {
    const px = coordToPixel(map, coord)
    if (!px) {
      return
    }
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
 * @param {number} [tolerance]
 * @returns {{ index: number, type: 'vertex'|'midpoint' } | null}
 */
export const findNearest = (map, vertices, midpoints, pixel, tolerance = PIXEL_TOLERANCE) => {
  return findNearestVertex(map, vertices, pixel, tolerance) ??
    findNearestMidpoint(map, midpoints, pixel, vertices.length, tolerance)
}
