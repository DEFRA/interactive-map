/**
 * Pure geometry helpers for multi-ring/multi-part geometry support.
 * Handles coordinate transformations between flat arrays and hierarchical GeoJSON.
 * Supports Polygon, MultiPolygon, LineString, MultiLineString.
 */

export const getCoords = (geom) => {
  if (!geom?.coordinates) {
    return []
  }
  switch (geom.type) {
    case 'LineString': return geom.coordinates
    case 'Polygon': return geom.coordinates.flatMap(ring => ring.slice(0, -1))
    case 'MultiLineString': return geom.coordinates.flat(1)
    case 'MultiPolygon': return geom.coordinates.flatMap(poly => poly.flatMap(ring => ring.slice(0, -1)))
    default: return []
  }
}

/**
 * Segment metadata for each ring or part.
 * { start, length, path, closed }
 */
export const getRingSegments = (geom) => {
  if (!geom?.coordinates) {
    return []
  }
  const segments = []
  let start = 0

  switch (geom.type) {
    case 'LineString':
      segments.push({ start: 0, length: geom.coordinates.length, path: [], closed: false })
      break
    case 'Polygon':
      geom.coordinates.forEach((ring, i) => {
        const len = ring.length - 1
        segments.push({ start, length: len, path: [i], closed: true })
        start += len
      })
      break
    case 'MultiLineString':
      geom.coordinates.forEach((line, i) => {
        segments.push({ start, length: line.length, path: [i], closed: false })
        start += line.length
      })
      break
    case 'MultiPolygon':
      geom.coordinates.forEach((polygon, pi) => {
        polygon.forEach((ring, ri) => {
          const len = ring.length - 1
          segments.push({ start, length: len, path: [pi, ri], closed: true })
          start += len
        })
      })
      break
    default:
      break
  }

  return segments
}

/** Find which segment a flat vertex index belongs to. */
export const getSegmentForIndex = (segments, flatIdx) => {
  for (const seg of segments) {
    if (flatIdx >= seg.start && flatIdx < seg.start + seg.length) {
      return { segment: seg, localIdx: flatIdx - seg.start }
    }
  }
  return null
}

/** Return a reference to the coordinate array at a hierarchical path. */
export const getModifiableCoords = (geojsonGeometry, path) => {
  let coords = geojsonGeometry.coordinates
  for (const idx of path) {
    coords = coords[idx]
  }
  return coords
}

/** Compute midpoints for all segments, respecting open/closed ring boundaries. */
export const getMidpoints = (geom) => {
  const coords = getCoords(geom)
  const segments = getRingSegments(geom)
  if (!coords.length || !segments.length) {
    return []
  }

  const midpoints = []
  for (const seg of segments) {
    const count = seg.closed ? seg.length : seg.length - 1
    for (let i = 0; i < count; i++) {
      const idx = seg.start + i
      const nextIdx = seg.start + ((i + 1) % seg.length)
      const [x1, y1] = coords[idx]
      const [x2, y2] = coords[nextIdx]
      midpoints.push([(x1 + x2) / 2, (y1 + y2) / 2])
    }
  }
  return midpoints
}
