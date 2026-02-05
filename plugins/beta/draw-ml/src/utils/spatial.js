import polygonSplitter from 'polygon-splitter'
import turfBearing from '@turf/bearing'
import turfDestination from '@turf/destination'
import turfBooleanValid from '@turf/boolean-valid'
import turfArea from '@turf/area'
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
 * Extend a LineString at endpoints AND intermediate vertices.
 * For intermediate vertices on the polygon boundary, this creates small
 * extensions that ensure polygon-splitter recognizes them as crossing points.
 *
 * @param {Feature<LineString>} line
 * @param {number} extendDist (distance to extend in Turf units)
 */
function extendLine(line, extendDist = 1, units = 'meters') {
  const coords = line.geometry.coordinates
  const result = []

  // Extend start point backward
  const startBearing = turfBearing(coords[1], coords[0])
  const newStart = turfDestination(coords[0], extendDist, startBearing, { units })
  result.push(newStart.geometry.coordinates)

  // Process each vertex
  for (let i = 0; i < coords.length; i++) {
    if (i > 0 && i < coords.length - 1) {
      // Intermediate vertex: add extension past it (creates spike for boundary crossing)
      const incomingBearing = turfBearing(coords[i - 1], coords[i])
      const pastPt = turfDestination(coords[i], extendDist, incomingBearing, { units })
      result.push(pastPt.geometry.coordinates)
    }

    result.push(coords[i])
  }

  // Extend end point forward
  const endBearing = turfBearing(coords[coords.length - 2], coords[coords.length - 1])
  const newEnd = turfDestination(coords[coords.length - 1], extendDist, endBearing, { units })
  result.push(newEnd.geometry.coordinates)

  return turfLineString(result)
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
      return turfPolygon(geom.coordinates);
    case 'MultiPolygon':
      return turfMultiPolygon(geom.coordinates);
    case 'LineString':
      return turfLineString(geom.coordinates);
    case 'MultiLineString':
      return turfMultiLineString(geom.coordinates);
    case 'Point':
      return turfPoint(geom.coordinates);
    case 'MultiPoint':
      return turfMultiPoint(geom.coordinates);
    default:
      throw new Error(`Unsupported geometry type: ${geom.type}`)
  }
}

const haversine = ([lon1, lat1], [lon2, lat2]) => {
  const toRad = deg => deg * Math.PI / 180
  const R = 6371000 // meters
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const isNewCoordinate = (coords, tolerance = 0.01) => {
  // First coord
  if (coords[0].length <= 1) {
    return true
  }
  // Subsequent coordsmust be different
  if (coords[0].length <= 3) {
    for (let i = 0; i < coords[0].length; i++) {
      for (let j = i + 1; j < coords[0].length; j++) {
        if (haversine(coords[0][i], coords[0][j]) < tolerance) {
          return false
        }
      }
    }
  }
  return true
}

const isNewLineCoordinate = (coords, tolerance = 0.01) => {
  // First coord is always valid
  if (coords.length <= 1) {
    return true
  }
  // Check last two coords are different
  if (coords.length >= 2) {
    const last = coords[coords.length - 1]
    const secondLast = coords[coords.length - 2]
    if (haversine(last, secondLast) < tolerance) {
      return false
    }
  }
  return true
}

const isValidLineClick = (coords) => {
  // First coord is always valid
  if (coords.length <= 1) {
    return true
  }
  // Check that the new coordinate is different from the previous one
  return isNewLineCoordinate(coords)
}

const isValidClick = (coords) => {
  // Less than 4 and new coordinates
  if (coords[0].length <= 1 || isNewCoordinate(coords)) {
    return true
  }

  // Basic checks
  if (!Array.isArray(coords) || coords.length < 4) {
    return false
  }

  // Check if ring is closed
  const first = coords[0]
  const last = coords[coords.length - 1]
  const isClosed = first[0] === last[0] && first[1] === last[1]
  if (!isClosed) {
    return false
  }

  // Create a turf polygon
  const turfPoly = turfPolygon([coords])

  // Check if geometry is valid (non-self-intersecting)
  const valid = turfBooleanValid(turfPoly)
  if (!valid) {
    return false
  }

  // Check if area is positive
  const polyArea = turfArea(turfPoly)
  if (polyArea <= 0) {
    return false
  }

  return true
}

const spatialNavigate = (start, pixels, direction) => {
  const quadrant = pixels.filter((p, i) => {
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