import { polygon, multiPolygon, lineString, multiLineString, point, multiPoint } from '@turf/helpers'
import booleanDisjoint from '@turf/boolean-disjoint'
import bbox from '@turf/bbox'

/**
 * Convert a GeoJSON Feature or geometry-like object into a Turf geometry.
 *
 * @param {Object} featureOrGeom - Either a Feature with a `.geometry` property or a raw GeoJSON geometry object.
 * @returns {Object} Turf geometry (Polygon, LineString, Point, etc.)
 *
 * @throws Will throw if the geometry type is not supported.
 */
function toTurfGeometry (featureOrGeom) {
  const geom = featureOrGeom.geometry || featureOrGeom

  switch (geom.type) {
    case 'Polygon':
      return polygon(geom.coordinates)
    case 'MultiPolygon':
      return multiPolygon(geom.coordinates)
    case 'LineString':
      return lineString(geom.coordinates)
    case 'MultiLineString':
      return multiLineString(geom.coordinates)
    case 'Point':
      return point(geom.coordinates)
    case 'MultiPoint':
      return multiPoint(geom.coordinates)
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
function isContiguousWithAny (feature, features) {
  return features.some(f => !booleanDisjoint(toTurfGeometry(f), toTurfGeometry(feature)))
}

/**
 * A representative [lng, lat] centre point for a feature's geometry — the centre of its bounding
 * box. Used to position a polygon/line feature's entry in the accessible Features list (see
 * useMapItemList.js) so coordinate-based AT overlays (e.g. macOS Voice Control's Show Numbers)
 * land somewhere on the feature rather than off in a corner of the viewport. Deliberately a
 * bbox centre, not a true centroid/centre-of-mass — works uniformly for polygons and lines with
 * no extra dependency beyond what this file already uses, at the cost of being able to land
 * outside a very concave shape (same trade-off a true centroid has anyway).
 *
 * @param {Object} featureOrGeom - Either a Feature with a `.geometry` property or a raw GeoJSON geometry object.
 * @returns {[number, number]|null} [lng, lat], or null if the geometry is missing/unsupported.
 */
function getGeometryCenter (featureOrGeom) {
  try {
    const [minX, minY, maxX, maxY] = bbox(toTurfGeometry(featureOrGeom))
    return [(minX + maxX) / 2, (minY + maxY) / 2]
  } catch {
    return null
  }
}

const isPolygonal = (type) => type === 'Polygon' || type === 'MultiPolygon'

/**
 * Check if all features are polygons/multi-polygons and form a single contiguous group
 * (mergeable). Mixed geometry types (e.g. a line crossing a polygon) are never contiguous,
 * regardless of spatial overlap, so the type check runs first and skips the spatial work
 * entirely when it fails.
 *
 * Uses flood-fill to find connected components.
 *
 * @param {Array} features - Array of features to test
 * @returns {boolean} True if 2+ features, all polygonal, and all contiguous
 */
function areAllContiguous (features) {
  if (features.length < 2) {
    return false
  }

  if (features.some(feature => !isPolygonal(feature.geometry?.type))) {
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
  areAllContiguous,
  getGeometryCenter
}
