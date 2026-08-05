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

// Exported for the snap engine to merge candidates across features/layers
export const bestOf = (current, candidate) => better(current, candidate) ? candidate : current

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

// OL Vector rings duplicate the first coord as last; VectorTile rings do not.
// isClosedRing=true: skip the duplicated last vertex, wrap closing edge back to first.
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

// Edge candidates carry their segment endpoints (seg) and vertex candidates their
// neighbouring vertices (adjacent) so the snap engine can test segment orientation —
// used to recognise tile clip artefacts, which are always axis-aligned in tile space.
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
      best = bestOf(best, { type: 'edge', coord: pt, distSq: dSq, seg: [a, b] })
    }
  }
  return best
}

// Neighbouring vertex indices; closed rings (edgeCount === numPairs) wrap around the ring
const adjacentIndices = (i, numPairs, wraps) => {
  const prev = i > 0 ? i - 1 : numPairs - 1
  const next = i < numPairs - 1 ? i + 1 : 0
  return [
    (i > 0 || wraps) ? prev : null,
    (i < numPairs - 1 || wraps) ? next : null
  ]
}

const getBestVertex = (flat, start, numPairs, edgeCount, query, toleranceSq) => {
  const wraps = edgeCount === numPairs
  const coordAt = (i) => i === null ? null : [flat[start + i * 2], flat[start + i * 2 + 1]]
  let best = null
  for (let i = 0; i < numPairs; i++) {
    const v = coordAt(i)
    const dSq = dist2(query, v)
    if (dSq <= toleranceSq) {
      const [prevIdx, nextIdx] = adjacentIndices(i, numPairs, wraps)
      const adjacent = [coordAt(prevIdx), coordAt(nextIdx)]
      best = bestOf(best, { type: 'vertex', coord: v, distSq: dSq, adjacent })
    }
  }
  return best
}

// Returns the best vertex and best edge separately so the caller can filter one
// (e.g. a clip-artefact vertex) while still snapping to the other.
const testFlatCoords = (flat, start, end, query, toleranceSq, isClosedRing) => {
  const numPairs = (end - start) / 2
  const edgeCount = isClosedRing ? numPairs : numPairs - 1
  return {
    vertex: getBestVertex(flat, start, numPairs, edgeCount, query, toleranceSq),
    edge: getBestEdge(flat, start, numPairs, edgeCount, query, toleranceSq)
  }
}

const olGeomHandlers = {
  point: (geom, query, toleranceSq) => {
    const c = geom.getCoordinates()
    const dSq = dist2(query, c)
    return dSq <= toleranceSq ? { type: 'vertex', coord: [c[0], c[1]], distSq: dSq } : null
  },
  lineString: (geom, query, toleranceSq) => {
    return testCoords(geom.getCoordinates(), query, toleranceSq, false)
  },
  linearRing: (geom, query, toleranceSq) => {
    return testCoords(geom.getCoordinates(), query, toleranceSq, true)
  },
  polygon: (geom, query, toleranceSq) => {
    let best = null
    for (const ring of geom.getCoordinates()) {
      best = bestOf(best, testCoords(ring, query, toleranceSq, true))
    }
    return best
  },
  multiLineString: (geom, query, toleranceSq) => {
    let best = null
    for (const line of geom.getCoordinates()) {
      best = bestOf(best, testCoords(line, query, toleranceSq, false))
    }
    return best
  },
  multiPolygon: (geom, query, toleranceSq) => {
    let best = null
    for (const polygon of geom.getCoordinates()) {
      for (const ring of polygon) {
        best = bestOf(best, testCoords(ring, query, toleranceSq, true))
      }
    }
    return best
  }
}

export const testOLFeature = (feature, query, toleranceSq) => {
  const geom = feature.getGeometry()
  if (!geom) { return null }
  const rawType = geom.getType()
  const handler = olGeomHandlers[rawType[0].toLowerCase() + rawType.slice(1)]
  return handler ? handler(geom, query, toleranceSq) : null
}

// Returns an array of candidates (best vertex and best edge, when within tolerance)
// rather than a single winner, so the snap engine can filter clip artefacts per
// candidate and still fall back to the other.
export const testRenderFeature = (feature, query, toleranceSq) => {
  const type = feature.getType()
  const flat = feature.getFlatCoordinates()
  let bestVertex = null
  let bestEdge = null

  if (type === 'Point') {
    const dSq = dist2(query, flat)
    if (dSq <= toleranceSq) {
      bestVertex = { type: 'vertex', coord: [flat[0], flat[1]], distSq: dSq }
    }
  } else if (type === 'LineString') {
    ({ vertex: bestVertex, edge: bestEdge } = testFlatCoords(flat, 0, flat.length, query, toleranceSq, false))
  } else if (type === 'Polygon' || type === 'MultiLineString') {
    const ends = feature.getEnds()
    let start = 0
    const isClosedRing = type === 'Polygon'
    for (const end of ends) {
      const pair = testFlatCoords(flat, start, end, query, toleranceSq, isClosedRing)
      bestVertex = bestOf(bestVertex, pair.vertex)
      bestEdge = bestOf(bestEdge, pair.edge)
      start = end
    }
  } else {
    // MultiPoint / unknown — no snap candidates
  }

  return [bestVertex, bestEdge].filter(Boolean)
}
