import turfArea from '@turf/area'

/**
 * Engine-agnostic geometry validation.
 *
 * A rule is a pure `(feature, context) => { valid, reason }`. Two classes:
 *   - SOFT_RULES gate the Done button (geometryValid) — the change is always
 *     kept, so a shape can pass through interim invalid states while being
 *     built or reshaped.
 *   - HARD_RULES gate vertex placement — a failure rejects the placement and
 *     the vertex never appears (used for unrecoverable states, e.g. a vertex
 *     that would force the drawn path to cross itself).
 *
 * `context` is `{ kind, vertexIndex, mode }` so rules can vary by change kind or mode.
 * Add a rule by appending it to SOFT_RULES or HARD_RULES.
 */

const MIN_POLYGON_VERTICES = 3
const MIN_LINE_VERTICES = 2
const MIN_INTERSECT_VERTICES = 4 // need 4+ vertices for two non-adjacent edges to exist

const getGeometry = (feature) => feature?.geometry ?? feature
const getPolygon = (feature) => {
  const geometry = getGeometry(feature)
  return geometry?.type === 'Polygon' ? geometry : null
}

// Distinct outer-ring vertices. Drops consecutive duplicates (zero-length edges —
// e.g. the rubber band sitting on the just-placed vertex) which would otherwise
// read as false intersections, then any explicit closing point so open
// (in-progress) and closed (finished) rings are handled the same way.
const getRingVertices = (geometry) => {
  const raw = geometry.coordinates?.[0] ?? []
  const ring = raw.filter((v, i) => i === 0 || v[0] !== raw[i - 1][0] || v[1] !== raw[i - 1][1])
  while (ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]) {
    ring.pop()
  }
  return ring
}

const closeRing = (vertices) => [...vertices, vertices[0]]

// Signed area of the triangle (o, a, b); sign gives orientation, zero = collinear.
const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

// True when collinear point q lies within the bounding box of segment p→r.
const onSegment = (p, q, r) =>
  Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) &&
  Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1])

// True when d1 and d2 lie on opposite sides (one strictly positive, one strictly negative).
const straddles = (d1, d2) => (d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)

// True when p is collinear with the segment (d === 0) and lies on it.
const collinearHit = (d, a, p, b) => d === 0 && onSegment(a, p, b)

// True when segments (p1,p2) and (p3,p4) intersect (including collinear overlap).
const segmentsIntersect = (p1, p2, p3, p4) => {
  const d1 = cross(p3, p4, p1)
  const d2 = cross(p3, p4, p2)
  const d3 = cross(p1, p2, p3)
  const d4 = cross(p1, p2, p4)

  if (straddles(d1, d2) && straddles(d3, d4)) { return true }

  return collinearHit(d1, p3, p1, p4) || collinearHit(d2, p3, p2, p4) ||
    collinearHit(d3, p1, p3, p2) || collinearHit(d4, p1, p4, p2)
}

// Do any two non-adjacent edges cross? When `closed`, the implicit closing edge
// (last vertex back to the first) is included; when open, only the drawn edges are
// tested (used to reject a self-crossing vertex placement while drawing).
const edgesSelfIntersect = (vertices, closed) => {
  const n = vertices.length
  const edgeCount = closed ? n : n - 1
  for (let i = 0; i < edgeCount; i++) {
    for (let j = i + 1; j < edgeCount; j++) {
      const adjacent = j === i + 1 || (closed && i === 0 && j === edgeCount - 1)
      if (adjacent) { continue }
      if (segmentsIntersect(vertices[i], vertices[(i + 1) % n], vertices[j], vertices[(j + 1) % n])) {
        return true
      }
    }
  }
  return false
}

/**
 * HARD (draw placement): would the open drawn path cross itself? Run against the
 * candidate path (placed vertices + the point about to be placed) — a failure
 * rejects the placement so the vertex never appears and a genuine self-intersection
 * can't be drawn forward.
 */
export const pathSelfIntersects = (feature) => {
  const geometry = getPolygon(feature)
  if (!geometry) { return false }
  const vertices = getRingVertices(geometry)
  if (vertices.length < MIN_INTERSECT_VERTICES) { return false }
  return edgesSelfIntersect(vertices, false)
}

/** Rule-shaped wrapper for pathSelfIntersects (see HARD_RULES). */
export const noPathSelfIntersection = (feature) =>
  pathSelfIntersects(feature)
    ? { valid: false, reason: 'Point would make the shape intersect itself' }
    : { valid: true }

/**
 * A polygon must not self-intersect. Gates Done while drawing (a would-be-crossing
 * closing edge disables Done) and while editing.
 */
export const noSelfIntersection = (feature) => {
  const geometry = getPolygon(feature)
  if (!geometry) { return { valid: true } }
  const vertices = getRingVertices(geometry)
  if (vertices.length < MIN_INTERSECT_VERTICES) { return { valid: true } }
  return edgesSelfIntersect(vertices, true)
    ? { valid: false, reason: 'Shape must not intersect itself' }
    : { valid: true }
}

/**
 * A polygon must enclose a non-zero area (rejects collinear / degenerate rings).
 */
export const nonZeroArea = (feature) => {
  const geometry = getPolygon(feature)
  if (!geometry) { return { valid: true } }

  const vertices = getRingVertices(geometry)
  if (vertices.length < MIN_POLYGON_VERTICES) { return { valid: true } }

  let area = 0
  try {
    area = turfArea({ type: 'Feature', geometry: { type: 'Polygon', coordinates: [closeRing(vertices)] }, properties: {} })
  } catch {
    return { valid: true }
  }

  return area > 0 ? { valid: true } : { valid: false, reason: 'Shape must enclose an area' }
}

/**
 * A shape needs enough vertices to be finishable (3 for a polygon, 2 for a line).
 */
export const minVertices = (feature) => {
  const geometry = getGeometry(feature)
  if (geometry?.type === 'Polygon') {
    return getRingVertices(geometry).length >= MIN_POLYGON_VERTICES
      ? { valid: true }
      : { valid: false, reason: 'Shape needs at least 3 points' }
  }
  if (geometry?.type === 'LineString') {
    return (geometry.coordinates?.length ?? 0) >= MIN_LINE_VERTICES
      ? { valid: true }
      : { valid: false, reason: 'Line needs at least 2 points' }
  }
  return { valid: true }
}

// Validation rules. A failure disables the Done button (geometryValid).
// Order sets which reason surfaces first.
export const SOFT_RULES = [noSelfIntersection, nonZeroArea, minVertices]

// Rules that drive the live invalid stroke while drawing, run against the displayed
// geometry (placed vertices + cursor) on every rubber-band move. Everything soft
// EXCEPT minVertices — an incomplete shape is "part-drawn", not invalid.
// validateDisplayedGeometry applies the minimum-placed-vertex threshold instead.
export const LIVE_RULES = [noSelfIntersection, nonZeroArea]

// Placement rules. Run by validatePlacement against the candidate geometry
// (placed vertices + the point about to be placed); a failure rejects the
// placement outright — the vertex never appears.
export const HARD_RULES = [noPathSelfIntersection]
