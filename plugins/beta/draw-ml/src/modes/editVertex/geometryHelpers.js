/**
 * Pure geometry helper functions for multi-ring/multi-part geometry support.
 * These functions handle coordinate transformations between flat arrays and
 * hierarchical GeoJSON structures for Polygon, MultiPolygon, LineString, and MultiLineString.
 */

/**
 * Get flat coordinates array from feature for all geometry types.
 * Flattens all rings/parts into a single array for unified vertex navigation.
 *
 * @param {Object} feature - GeoJSON geometry object
 * @returns {Array<[number, number]>} Flat array of all coordinates
 */
export const getCoords = (feature) => {
  if (!feature?.coordinates) return []
  switch (feature.type) {
    case 'LineString':
      return feature.coordinates
    case 'Polygon':
      return feature.coordinates.flat(1)
    case 'MultiLineString':
      return feature.coordinates.flat(1)
    case 'MultiPolygon':
      return feature.coordinates.flat(2)
    default:
      return []
  }
}

/**
 * Get segment metadata for multi-ring/multi-part geometries.
 * Each segment represents a ring (for Polygon) or part (for Multi*).
 *
 * @param {Object} feature - GeoJSON geometry object
 * @returns {Array<{start: number, length: number, path: number[], closed: boolean}>}
 *   Array of segment metadata objects where:
 *   - start: Starting index in flat coordinates array
 *   - length: Number of coordinates in this segment
 *   - path: Hierarchical path indices to reach this segment in GeoJSON
 *   - closed: Whether this segment is closed (true for Polygon rings)
 */
export const getRingSegments = (feature) => {
  if (!feature?.coordinates) return []
  const segments = []
  let start = 0

  switch (feature.type) {
    case 'LineString':
      segments.push({ start: 0, length: feature.coordinates.length, path: [], closed: false })
      break
    case 'Polygon':
      feature.coordinates.forEach((ring, ringIdx) => {
        segments.push({ start, length: ring.length, path: [ringIdx], closed: true })
        start += ring.length
      })
      break
    case 'MultiLineString':
      feature.coordinates.forEach((line, lineIdx) => {
        segments.push({ start, length: line.length, path: [lineIdx], closed: false })
        start += line.length
      })
      break
    case 'MultiPolygon':
      feature.coordinates.forEach((polygon, polyIdx) => {
        polygon.forEach((ring, ringIdx) => {
          segments.push({ start, length: ring.length, path: [polyIdx, ringIdx], closed: true })
          start += ring.length
        })
      })
      break
    default:
      break
  }

  return segments
}

/**
 * Find which segment a flat vertex index belongs to.
 *
 * @param {Array} segments - Array of segment metadata from getRingSegments
 * @param {number} flatIdx - Flat vertex index
 * @returns {{segment: Object, localIdx: number}|null}
 *   Object with segment metadata and local index within that segment, or null if not found
 */
export const getSegmentForIndex = (segments, flatIdx) => {
  for (const seg of segments) {
    if (flatIdx >= seg.start && flatIdx < seg.start + seg.length) {
      return { segment: seg, localIdx: flatIdx - seg.start }
    }
  }
  return null
}

/**
 * Get modifiable coordinate array at a specific hierarchical path.
 * Returns a reference to the actual coordinate array in the GeoJSON structure.
 *
 * @param {Object} geojson - Full GeoJSON feature object
 * @param {number[]} path - Hierarchical path indices (e.g., [0] for first ring, [1, 0] for second polygon's first ring)
 * @returns {Array<[number, number]>} Reference to coordinate array at path
 */
export const getModifiableCoords = (geojson, path) => {
  let coords = geojson.geometry.coordinates
  for (const idx of path) {
    coords = coords[idx]
  }
  return coords
}

/**
 * Convert mapbox-gl-draw coord_path string to flat vertex index.
 * coord_path format: "ringIdx.vertexIdx" for Polygon, "polyIdx.ringIdx.vertexIdx" for MultiPolygon, etc.
 *
 * @param {Object} feature - GeoJSON geometry object
 * @param {string} coordPath - coord_path string from mapbox-gl-draw
 * @returns {number} Flat vertex index in the unified coordinate array
 */
export const coordPathToFlatIndex = (feature, coordPath) => {
  const parts = coordPath.split('.').map(Number)
  const segments = getRingSegments(feature)

  // Match coord_path to segment
  for (const seg of segments) {
    // Check if path matches (compare all but last element which is the local vertex index)
    const pathMatches = seg.path.every((val, idx) => val === parts[idx])
    if (pathMatches && parts.length === seg.path.length + 1) {
      const localIdx = parts[parts.length - 1]
      return seg.start + localIdx
    }
  }

  // Fallback: just use the last number (works for simple geometries)
  return parts[parts.length - 1]
}
