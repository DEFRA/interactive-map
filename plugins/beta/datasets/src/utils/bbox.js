/**
 * Get bbox from map as array [west, south, east, north]
 * @param {Object} map - Map instance
 * @returns {number[]} bbox as [west, south, east, north]
 */
export const getBboxArray = (map) => {
  const bounds = map.getBounds()
  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

/**
 * Check if inner bbox is fully contained within outer bbox
 * @param {number[]} outer - [west, south, east, north]
 * @param {number[]} inner - [west, south, east, north]
 * @returns {boolean}
 */
export const bboxContains = (outer, inner) => {
  if (!outer || !inner) {
    return false
  }
  return (
    inner[0] >= outer[0] && // west
    inner[1] >= outer[1] && // south
    inner[2] <= outer[2] && // east
    inner[3] <= outer[3]    // north
  )
}

/**
 * Expand bbox to include another bbox
 * @param {number[]|null} existing - Current bbox or null
 * @param {number[]} addition - Bbox to include
 * @returns {number[]} Expanded bbox
 */
export const expandBbox = (existing, addition) => {
  if (!existing) {
    return [...addition]
  }
  return [
    Math.min(existing[0], addition[0]), // west
    Math.min(existing[1], addition[1]), // south
    Math.max(existing[2], addition[2]), // east
    Math.max(existing[3], addition[3])  // north
  ]
}

/**
 * Check if two bboxes intersect
 * @param {number[]} a - [west, south, east, north]
 * @param {number[]} b - [west, south, east, north]
 * @returns {boolean}
 */
export const bboxIntersects = (a, b) => {
  if (!a || !b) {
    return false
  }
  return !(
    a[2] < b[0] || // a is left of b
    a[0] > b[2] || // a is right of b
    a[3] < b[1] || // a is below b
    a[1] > b[3]    // a is above b
  )
}

/**
 * Get bbox from a GeoJSON geometry
 * @param {Object} geometry - GeoJSON geometry
 * @returns {number[]} bbox as [west, south, east, north]
 */
export const getGeometryBbox = (geometry) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  const processCoord = (coord) => {
    minX = Math.min(minX, coord[0])
    minY = Math.min(minY, coord[1])
    maxX = Math.max(maxX, coord[0])
    maxY = Math.max(maxY, coord[1])
  }

  const processCoords = (coords, depth) => {
    if (depth === 0) {
      processCoord(coords)
    } else {
      coords.forEach(c => processCoords(c, depth - 1))
    }
  }

  switch (geometry.type) {
    case 'Point':
      processCoords(geometry.coordinates, 0)
      break
    case 'LineString':
    case 'MultiPoint':
      processCoords(geometry.coordinates, 1)
      break
    case 'Polygon':
    case 'MultiLineString':
      processCoords(geometry.coordinates, 2)
      break
    case 'MultiPolygon':
      processCoords(geometry.coordinates, 3)
      break
    case 'GeometryCollection':
      geometry.geometries.forEach(g => {
        const b = getGeometryBbox(g)
        minX = Math.min(minX, b[0])
        minY = Math.min(minY, b[1])
        maxX = Math.max(maxX, b[2])
        maxY = Math.max(maxY, b[3])
      })
      break
  }

  return [minX, minY, maxX, maxY]
}
