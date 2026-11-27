/**
 * Converts between the map's CRS (the coordinates the API and data use) and the lng/lat MapLibre's
 * own API uses. In EPSG:4326 they're the same, so nothing is converted.
 *
 * In EPSG:27700 it uses the same transform as the projection MapLibre renders with, so eastings and
 * northings converted to lng/lat land back exactly where they started.
 */

const mapPositions = (coordinates, convert) => typeof coordinates[0] === 'number'
  ? [...convert(coordinates.slice(0, 2)), ...coordinates.slice(2)]
  : coordinates.map(child => mapPositions(child, convert))

const mapGeometry = (geometry, convert) => {
  if (!geometry) {
    return geometry
  }
  if (geometry.type === 'GeometryCollection') {
    return { ...geometry, geometries: geometry.geometries.map(child => mapGeometry(child, convert)) }
  }
  return { ...geometry, coordinates: mapPositions(geometry.coordinates, convert) }
}

const mapGeoJSON = (geojson, convert) => {
  if (!geojson) {
    return geojson
  }
  if (geojson.type === 'FeatureCollection') {
    return { ...geojson, features: geojson.features.map(feature => mapGeoJSON(feature, convert)) }
  }
  if (geojson.type === 'Feature') {
    return { ...geojson, geometry: mapGeometry(geojson.geometry, convert) }
  }
  return mapGeometry(geojson, convert)
}

// [minX, minY, maxX, maxY] enclosing all four converted corners
const mapBbox = ([minX, minY, maxX, maxY], convert) => {
  const corners = [[minX, minY], [minX, maxY], [maxX, minY], [maxX, maxY]].map(corner => convert(corner))
  const xs = corners.map(([cornerX]) => cornerX)
  const ys = corners.map(([, cornerY]) => cornerY)
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

const identity = value => value

const LNG_LAT = {
  toLngLat: identity,
  fromLngLat: identity,
  geojsonToLngLat: identity,
  geojsonFromLngLat: identity,
  bboxToLngLat: identity,
  bboxFromLngLat: identity
}

/**
 * @param {{ forward: Function, inverse: Function }} [projection] - Converts lng/lat to the map's CRS
 *   (forward) and back (inverse). Omitted for EPSG:4326.
 */
export const createCoordinateConverter = (projection) => {
  if (!projection) {
    return LNG_LAT
  }
  const toLngLat = coords => projection.inverse(coords)
  const fromLngLat = coords => projection.forward(coords)
  return {
    toLngLat,
    fromLngLat,
    geojsonToLngLat: geojson => mapGeoJSON(geojson, toLngLat),
    geojsonFromLngLat: geojson => mapGeoJSON(geojson, fromLngLat),
    bboxToLngLat: bbox => mapBbox(bbox, toLngLat),
    bboxFromLngLat: bbox => mapBbox(bbox, fromLngLat)
  }
}
