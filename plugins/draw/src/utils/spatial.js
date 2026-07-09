import polygonSplitter from 'polygon-splitter'
import turfBearing from '@turf/bearing'
import turfDestination from '@turf/destination'
import {
  featureCollection as turfFeatureCollection,
  polygon as turfPolygon,
  multiPolygon as turfMultiPolygon,
  lineString as turfLineString,
  multiLineString as turfMultiLineString,
  point as turfPoint,
  multiPoint as turfMultiPoint
} from '@turf/helpers'

/**
 * @typedef {import('geojson').Feature<import('geojson').Polygon>} Polygon
 * @typedef {import('geojson').Feature<import('geojson').LineString>} Line
 * @typedef {import('geojson').Feature<import('geojson').Feature>} Feature
 * @typedef {import('geojson').FeatureCollection<import('geojson').FeatureCollection>} FeatureCollection
 */

/**
 * Extend a LineString at endpoints.
 *
 * @param {Feature<LineString>} line
 * @param {number} extendDist (distance to extend in Turf units)
 */
function extendLine (line, extendDist = 1, units = 'meters') {
  const coords = line.geometry.coordinates.map(c => [...c])

  // Extend start point backward
  const startBearing = turfBearing(coords[1], coords[0])
  const newStart = turfDestination(coords[0], extendDist, startBearing, { units })
  coords[0] = newStart.geometry.coordinates

  // Extend end point forward
  const endBearing = turfBearing(coords[coords.length - 2], coords[coords.length - 1])
  const newEnd = turfDestination(coords[coords.length - 1], extendDist, endBearing, { units })
  coords[coords.length - 1] = newEnd.geometry.coordinates

  return turfLineString(coords)
}

/**
 * Split a polygon using a line.
 * Only accepts splits that result in exactly two polygons.
 *
 * @param {Feature<Polygon>} polygon
 * @param {Feature<LineString>} line
 * @returns {FeatureCollection<Polygon>|null}
 */
const splitPolygon = (polygon, line) => {
  // Extend only start and end vertices
  const extended = extendLine(line) // assume extendLine only touches start/end now

  let result
  try {
    result = polygonSplitter(polygon, extended)
  } catch {
    return null
  }

  // Must result in exactly 2 polygons
  let polygons = []
  if (result.geometry.type === 'MultiPolygon') {
    if (result.geometry.coordinates.length !== 2) {
      return null
    }
    polygons = result.geometry.coordinates.map(coords => turfPolygon(coords, polygon.properties))
  } else {
    return null
  }

  // Assign IDs & properties
  const baseId = polygon.id ?? polygon.properties?.id ?? 'poly'
  const features = polygons.map((poly, i) =>
    turfPolygon(
      poly.geometry.coordinates,
      { ...polygon.properties, id: baseId },
      { id: `${baseId}-${i + 1}` }
    )
  )

  return turfFeatureCollection(features)
}

/**
 * Convert a GeoJSON Feature or geometry-like object into a Turf geometry.
 *
 * @param {Object} featureOrGeom - Either a Feature with a `.geometry` property or a raw GeoJSON geometry object.
 * @returns {Object} Turf geometry (Polygon, LineString, Point, etc.)
 *
 * @throws Will throw if the geometry type is not supported.
 */
const toTurfGeometry = (featureOrGeom) => {
  const geom = featureOrGeom.geometry || featureOrGeom

  switch (geom.type) {
    case 'Polygon':
      return turfPolygon(geom.coordinates)
    case 'MultiPolygon':
      return turfMultiPolygon(geom.coordinates)
    case 'LineString':
      return turfLineString(geom.coordinates)
    case 'MultiLineString':
      return turfMultiLineString(geom.coordinates)
    case 'Point':
      return turfPoint(geom.coordinates)
    case 'MultiPoint':
      return turfMultiPoint(geom.coordinates)
    default:
      throw new Error(`Unsupported geometry type: ${geom.type}`)
  }
}

const DEGREES_PER_HALF_TURN = 180

const haversine = ([lon1, lat1], [lon2, lat2]) => {
  const toRad = deg => deg * Math.PI / DEGREES_PER_HALF_TURN
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const SMALL_RING_LENGTH = 3

// True if any two points in the ring are within `tolerance` of each other
const hasDuplicatePair = (ring, tolerance) => {
  for (let i = 0; i < ring.length; i++) {
    for (let j = i + 1; j < ring.length; j++) {
      if (haversine(ring[i], ring[j]) < tolerance) {
        return true
      }
    }
  }
  return false
}

const isNewCoordinate = (coords, tolerance = 0.01) => {
  const ring = coords[0]
  // First coord is always new
  if (ring.length <= 1) {
    return true
  }
  // For small rings, reject if any two points coincide
  if (ring.length <= SMALL_RING_LENGTH && hasDuplicatePair(ring, tolerance)) {
    return false
  }
  return true
}

const isValidLineClick = (coords, tolerance = 0.01) => {
  // First coord is always valid
  if (coords.length <= 1) {
    return true
  }
  // The new coordinate must differ from the previous one
  const last = coords[coords.length - 1]
  const secondLast = coords[coords.length - 2]
  return haversine(last, secondLast) >= tolerance
}

const isValidClick = (coords) => {
  // Valid when it's the very first point, or a genuinely new (non-duplicate) coordinate.
  // Callers only pass single-ring polygon coordinates while drawing, so no ring-closure /
  // self-intersection checks are needed here.
  return coords[0].length <= 1 || isNewCoordinate(coords)
}

const spatialNavigate = (start, pixels, direction) => {
  const quadrant = pixels.filter((p) => {
    const offsetX = Math.abs(p[0] - start[0])
    const offsetY = Math.abs(p[1] - start[1])
    let isQuadrant = false
    if (direction === 'ArrowUp') {
      isQuadrant = p[1] <= start[1] && offsetY >= offsetX
    } else if (direction === 'ArrowDown') {
      isQuadrant = p[1] > start[1] && offsetY >= offsetX
    } else if (direction === 'ArrowLeft') {
      isQuadrant = p[0] <= start[0] && offsetY < offsetX
    } else if (direction === 'ArrowRight') {
      isQuadrant = p[0] > start[0] && offsetY < offsetX
    } else {
      isQuadrant = true
    }
    return isQuadrant && (JSON.stringify(p) !== JSON.stringify(start))
  })

  if (!quadrant.length) {
    quadrant.push(start)
  }

  const pythagorean = (a, b) => Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2))
  const distances = quadrant.map(p => pythagorean(Math.abs(start[0] - p[0]), Math.abs(start[1] - p[1])))
  const closest = quadrant[distances.indexOf(Math.min(...distances))]
  return pixels.findIndex(i => JSON.stringify(i) === JSON.stringify(closest))
}

export {
  toTurfGeometry,
  splitPolygon,
  extendLine,
  isNewCoordinate,
  isValidClick,
  isValidLineClick,
  spatialNavigate
}
