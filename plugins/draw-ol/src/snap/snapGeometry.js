/**
 * Pure geometry helpers for snap candidate testing.
 * No OL imports, no side effects — only coordinate math.
 *
 * All coordinates are [x, y] pairs in map projection units.
 */

const dist2 = (a, b) => {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

const closestPointOnSegment = (p, a, b) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    return [a[0], a[1]]
  }
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq))
  return [a[0] + t * dx, a[1] + t * dy]
}

const bestOf = (current, candidate) => better(current, candidate) ? candidate : current

const better = (a, b) => {
  if (!a) {
    return !!b
  }
  if (!b) {
    return false
  }
  // Vertex always beats edge — only compare distance within the same type
  if (a.type === 'edge' && b.type === 'vertex') {
    return true
  }
  if (a.type === 'vertex' && b.type === 'edge') {
    return false
  }
  return b.distSq < a.distSq
}

/**
 * Test all vertices and edges of a coordinate ring/line for snap candidates.
 * coords: [[x,y], ...] — OL ring (first === last for closed rings)
 * isClosedRing: if true, OL has duplicated the first coord as last; skip it and wrap edges
 */
const testCoords = (coords, query, toleranceSq, isClosedRing) => {
  let best = null
  const n = isClosedRing && coords.length > 1 ? coords.length - 1 : coords.length
  const edgeCount = isClosedRing ? n : n - 1

  for (let i = 0; i < n; i++) {
    const v = coords[i]
    const dSq = dist2(query, v)
    if (dSq <= toleranceSq) {
      best = bestOf(best, { type: 'vertex', coord: [v[0], v[1]], distSq: dSq })
    }
  }

  for (let i = 0; i < edgeCount; i++) {
    const a = coords[i]
    const b = coords[(i + 1) % n]
    const pt = closestPointOnSegment(query, a, b)
    const dSq = dist2(query, pt)
    if (dSq <= toleranceSq) {
      best = bestOf(best, { type: 'edge', coord: pt, distSq: dSq })
    }
  }

  return best
}

/**
 * Test flat coordinate array (stride 2) from a VectorTile RenderFeature.
 * flat: number[] — [x0,y0,x1,y1,...]
 * start/end: index range within flat
 * isClosedRing: VTile polygon rings — first coord is NOT duplicated at end (unlike OL Vector)
 *   so treat all coords as unique vertices and add a closing edge back to first
 */
const getBestEdge = (flat, start, numPairs, edgeCount, query, toleranceSq) => {
  let best = null
  for (let i = 0; i < edgeCount; i++) {
    const ai = start + i * 2
    const bi = start + ((i + 1) % numPairs) * 2
    const a = [flat[ai], flat[ai + 1]]
    const b = [flat[bi], flat[bi + 1]]
    const pt = closestPointOnSegment(query, a, b)
    const dSq = dist2(query, pt)
    if (dSq <= toleranceSq) {
      best = bestOf(best, { type: 'edge', coord: pt, distSq: dSq })
    }
  }
  return best
}

const getBestPair = (flat, start, numPairs, edgeCount, query, toleranceSq) => {
  let best = null
  for (let i = 0; i < numPairs; i++) {
    const xi = start + i * 2
    const v = [flat[xi], flat[xi + 1]]
    const dSq = dist2(query, v)
    if (dSq <= toleranceSq) {
      best = bestOf(best, { type: 'vertex', coord: v, distSq: dSq })
    }
  }
  return bestOf(best, getBestEdge(flat, start, numPairs, edgeCount, query, toleranceSq))
}

const testFlatCoords = (flat, start, end, query, toleranceSq, isClosedRing) => {
  const numPairs = (end - start) / 2
  const edgeCount = isClosedRing ? numPairs : numPairs - 1
  return getBestPair(flat, start, numPairs, edgeCount, query, toleranceSq)
}

const olGeomHandlers = {
  Point (geom, query, toleranceSq) {
    const c = geom.getCoordinates()
    const dSq = dist2(query, c)
    return dSq <= toleranceSq ? { type: 'vertex', coord: [c[0], c[1]], distSq: dSq } : null
  },
  LineString (geom, query, toleranceSq) {
    return testCoords(geom.getCoordinates(), query, toleranceSq, false)
  },
  LinearRing (geom, query, toleranceSq) {
    return testCoords(geom.getCoordinates(), query, toleranceSq, true)
  },
  Polygon (geom, query, toleranceSq) {
    let best = null
    for (const ring of geom.getCoordinates()) {
      best = bestOf(best, testCoords(ring, query, toleranceSq, true))
    }
    return best
  },
  MultiLineString (geom, query, toleranceSq) {
    let best = null
    for (const line of geom.getCoordinates()) {
      best = bestOf(best, testCoords(line, query, toleranceSq, false))
    }
    return best
  },
  MultiPolygon (geom, query, toleranceSq) {
    let best = null
    for (const polygon of geom.getCoordinates()) {
      for (const ring of polygon) {
        best = bestOf(best, testCoords(ring, query, toleranceSq, true))
      }
    }
    return best
  }
}

/**
 * Test an OL Feature (from a VectorSource) against query coord.
 * Handles Point, LineString, LinearRing, Polygon, MultiLineString, MultiPolygon.
 *
 * @returns {{ type: 'vertex'|'edge', coord: number[], distSq: number } | null}
 */
export const testOLFeature = (feature, query, toleranceSq) => {
  const geom = feature.getGeometry()
  if (!geom) {
    return null
  }
  const handler = olGeomHandlers[geom.getType()]
  return handler ? handler(geom, query, toleranceSq) : null
}

/**
 * Test an OL RenderFeature (from a VectorTileSource) against query coord.
 * Handles Point, LineString, Polygon, MultiLineString.
 *
 * @returns {{ type: 'vertex'|'edge', coord: number[], distSq: number } | null}
 */
export const testRenderFeature = (feature, query, toleranceSq) => {
  const type = feature.getType()
  const flat = feature.getFlatCoordinates()
  let best = null

  if (type === 'Point') {
    const dSq = dist2(query, flat)
    if (dSq <= toleranceSq) {
      best = bestOf(best, { type: 'vertex', coord: [flat[0], flat[1]], distSq: dSq })
    }
  } else if (type === 'LineString') {
    best = bestOf(best, testFlatCoords(flat, 0, flat.length, query, toleranceSq, false))
  } else if (type === 'Polygon' || type === 'MultiLineString') {
    const ends = feature.getEnds()
    let start = 0
    const isClosedRing = type === 'Polygon'
    for (const end of ends) {
      best = bestOf(best, testFlatCoords(flat, start, end, query, toleranceSq, isClosedRing))
      start = end
    }
  } else {
    // No action
  }

  return best
}
