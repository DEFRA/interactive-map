/**
 * Flatten geometry coordinates into a flat array of [lng, lat] pairs.
 *
 * @param {any} coordinates - GeoJSON coordinates.
 * @param {string} type - GeoJSON geometry type.
 * @returns {Array<[number, number]>}
 */
const flattenCoords = (coordinates, type) => {
  if (type === 'Point') {
    return [coordinates]
  }
  if (type === 'MultiPoint' || type === 'LineString') {
    return coordinates
  }
  if (type === 'MultiLineString' || type === 'Polygon') {
    return coordinates.flat()
  }
  return coordinates.flat(2) // MultiPolygon
}

/**
 * Calculate the minimum squared screen-pixel distance from a point to a feature's
 * geometry vertices.
 *
 * @param {import('maplibre-gl').Map} map - MapLibre map instance (for projection).
 * @param {{ x: number, y: number }} point - Screen pixel position.
 * @param {Object} geometry - GeoJSON geometry object.
 * @returns {number} Minimum squared pixel distance.
 */
const screenDistance = (map, point, geometry) => {
  const coords = flattenCoords(geometry.coordinates, geometry.type)
  let min = Infinity

  for (const [lng, lat] of coords) {
    const { x, y } = map.project([lng, lat])
    const d = (x - point.x) ** 2 + (y - point.y) ** 2
    if (d < min) {
      min = d
    }
  }

  return min
}

/**
 * Query rendered features at a screen pixel position, optionally expanding
 * the query area by a pixel radius and sorting results closest-first.
 *
 * @param {import('maplibre-gl').Map} map - MapLibre map instance.
 * @param {{ x: number, y: number }} point - Screen pixel position.
 * @param {Object} [options]
 * @param {number} [options.radius] - Pixel radius to expand the query area.
 * @returns {any[]} Features sorted by proximity when radius is provided.
 */
export const queryFeatures = (map, point, options = {}) => {
  const { radius } = options

  if (!radius) {
    return map.queryRenderedFeatures(point)
  }

  const bbox = [
    [point.x - radius, point.y - radius],
    [point.x + radius, point.y + radius]
  ]

  const features = map.queryRenderedFeatures(bbox)

  return features
    .map(f => ({ f, d: screenDistance(map, point, f.geometry) }))
    .sort((a, b) => a.d - b.d)
    .map(({ f }) => f)
}
