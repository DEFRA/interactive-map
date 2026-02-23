import { polygon, multiPolygon, lineString, multiLineString, point, multiPoint } from '@turf/helpers'
import booleanDisjoint from '@turf/boolean-disjoint'

/**
 * Convert a GeoJSON Feature or geometry-like object into a Turf geometry.
 *
 * @param {Object} featureOrGeom - Either a Feature with a `.geometry` property or a raw GeoJSON geometry object.
 * @returns {Object} Turf geometry (Polygon, LineString, Point, etc.)
 *
 * @throws Will throw if the geometry type is not supported.
 */
function toTurfGeometry(featureOrGeom) {
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

/**
 * Check if a feature is contiguous (touches or overlaps) with any feature in an array.
 *
 * @param {Object} feature - The feature to test
 * @param {Array} features - Array of features to test against
 * @returns {boolean} True if the feature is contiguous with at least one feature in the array
 */
function isContiguousWithAny(feature, features) {
  return features.some(f => !booleanDisjoint(toTurfGeometry(f), toTurfGeometry(feature)))
}

/**
 * Check if a single polygon/multipolygon feature can be split.
 *
 * @param {Array} features - Array of features
 * @returns {boolean} True if exactly one polygon or multipolygon feature
 */
function canSplitFeatures(features) {
  if (features.length !== 1) {
    return false
  }
  const type = features[0].geometry?.type
  return type === 'Polygon' || type === 'MultiPolygon'
}

/**
 * Check if all features form a single contiguous group (can be merged).
 * Uses flood-fill to find connected components.
 *
 * @param {Array} features - Array of features to test
 * @returns {boolean} True if 2+ features and all are contiguous
 */
function areAllContiguous(features) {
  if (features.length < 2) {
    return false
  }

  if (features.some(f => !f.geometry?.type)) {
    return false
  }

  const connected = new Set([0])
  let changed = true

  while (changed) {
    changed = false
    for (let i = 1; i < features.length; i++) {
      if (connected.has(i)) {
        continue
      }
      const connectedFeatures = [...connected].map(idx => features[idx])
      if (isContiguousWithAny(features[i], connectedFeatures)) {
        connected.add(i)
        changed = true
      }
    }
  }

  return connected.size === features.length
}

export {
  toTurfGeometry,
  isContiguousWithAny,
  canSplitFeatures,
  areAllContiguous
}
