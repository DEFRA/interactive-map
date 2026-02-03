import { polygon, multiPolygon, lineString, multiLineString, point, multiPoint } from '@turf/helpers'

/**
 * Convert a GeoJSON Feature or geometry-like object into a Turf geometry.
 *
 * @param {Object} featureOrGeom - Either a Feature with a `.geometry` property or a raw GeoJSON geometry object.
 * @returns {Object} Turf geometry (Polygon, LineString, Point, etc.)
 *
 * @throws Will throw if the geometry type is not supported.
 */
export function toTurfGeometry(featureOrGeom) {
  const geom = featureOrGeom.geometry || featureOrGeom

  switch (geom.type) {
    case 'Polygon':
      return polygon(geom.coordinates);
    case 'MultiPolygon':
      return multiPolygon(geom.coordinates);
    case 'LineString':
      return lineString(geom.coordinates);
    case 'MultiLineString':
      return multiLineString(geom.coordinates);
    case 'Point':
      return point(geom.coordinates);
    case 'MultiPoint':
      return multiPoint(geom.coordinates);
    default:
      throw new Error(`Unsupported geometry type: ${geom.type}`)
  }
}
