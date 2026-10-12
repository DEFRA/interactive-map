// src/utils/spatial.js
import turfBbox from '@turf/bbox'

// -----------------------------------------------------------------------------
// Internal (not exported)
// -----------------------------------------------------------------------------

const EARTH_RADIUS_METRES = 6371e3
const RADIANS_PER_DEGREE = Math.PI / 180
const MIN_MOVE_DEGREES = 0.0001 // moves smaller than this aren't announced

const toRadians = (degrees) => degrees * RADIANS_PER_DEGREE

/**
 * Calculate distance in metres between two [lng, lat] coordinates (haversine)
 */
const getDistance = (from, to) => {
  const [lng1, lat1] = from
  const [lng2, lat2] = to

  const lat1Rad = toRadians(lat1)
  const lat2Rad = toRadians(lat2)
  const dLat = lat2Rad - lat1Rad
  const dLng = toRadians(lng2 - lng1)

  const haversine = Math.sin(dLat / 2) ** 2 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLng / 2) ** 2
  const centralAngle = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  return EARTH_RADIUS_METRES * centralAngle
}

/**
 * Format dimension, metres if less than 0.5 miles, otherwise miles
 */
const formatDimension = (metres) => {
  const WHOLE_MILE_THRESHOLD = 10
  const MILE_THRESHOLD = 0.5
  const METRES_PER_MILE = 1609.344

  const miles = metres / METRES_PER_MILE

  // Check if we are under the half-mile threshold
  if (miles < MILE_THRESHOLD) {
    const roundedMetres = Math.round(metres)
    const units = roundedMetres === 1 ? 'metre' : 'metres'
    return `${roundedMetres} ${units}`
  }

  if (miles < WHOLE_MILE_THRESHOLD) {
    const value = Number.parseFloat(miles.toFixed(1))
    const units = value === 1 ? 'mile' : 'miles'
    return `${value} ${units}`
  }

  const rounded = Math.round(miles)
  return `${rounded} miles`
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * bounds: [[west, south], [east, north]]
 * Returns: "400 metres by 1.4 miles"
 */
const getAreaDimensions = (bounds) => {
  let west, south, east, north

  if (bounds && typeof bounds.getWest === 'function') {
    // MapLibre LngLatBounds object
    west = bounds.getWest()
    south = bounds.getSouth()
    east = bounds.getEast()
    north = bounds.getNorth()
  } else if (Array.isArray(bounds) && bounds.length === 2) {
    // Array format: [[west, south], [east, north]]
    [[west, south], [east, north]] = bounds
  } else {
    return ''
  }

  // Width: west <-> east at the southern latitude
  const widthMetres = getDistance([west, south], [east, south])
  // Height: south <-> north at the western longitude
  const heightMetres = getDistance([west, south], [west, north])

  const widthLabel = formatDimension(widthMetres)
  const heightLabel = formatDimension(heightMetres)

  return `${heightLabel} by ${widthLabel}`
}

/**
 * Generate a cardinal direction move description.
 * Only non-zero moves are announced.
 * Example: "north 400 metres", "east 750 metres", or "south 400 metres, west 750 metres"
 */
const getCardinalMove = (from, to) => {
  const [lng1, lat1] = from
  const [lng2, lat2] = to

  const dLat = lat2 - lat1
  const dLng = lng2 - lng1

  const moves = []

  if (Math.abs(dLat) > MIN_MOVE_DEGREES) {
    const metres = Math.round(getDistance([lng1, lat1], [lng1, lat2]))
    moves.push(`${dLat > 0 ? 'north' : 'south'} ${formatDimension(metres)}`)
  }

  if (Math.abs(dLng) > MIN_MOVE_DEGREES) {
    const metres = Math.round(getDistance([lng1, lat1], [lng2, lat1]))
    moves.push(`${dLng > 0 ? 'east' : 'west'} ${formatDimension(metres)}`)
  }

  return moves.join(', ')
}

const getResolution = (center, zoom) => {
  const EARTH_CIRCUMFERENCE = 40075016.686
  const TILE_SIZE = 512
  const lat = center.lat
  const scale = Math.pow(2, zoom)
  const resolution = (EARTH_CIRCUMFERENCE * Math.cos(toRadians(lat))) / (scale * TILE_SIZE)
  return resolution
}

const getPaddedBounds = (LngLatBounds, map) => {
  const { width, height } = map.getContainer().getBoundingClientRect()
  const padding = map.getPadding() // returns { top, right, bottom, left }

  // Calculate pixel coordinates of the visible (unpadded) corners
  const sw = [padding.left, height - padding.bottom]
  const ne = [width - padding.right, padding.top]

  // Convert screen pixels to geographic coordinates
  const swLngLat = map.unproject(sw)
  const neLngLat = map.unproject(ne)

  return new LngLatBounds(swLngLat, neLngLat)
}

/**
 * Get a flat bbox [west, south, east, north] from any GeoJSON object
 * (Feature, FeatureCollection, or geometry).
 *
 * @param {object} geojson - GeoJSON Feature, FeatureCollection, or geometry
 * @returns {[number, number, number, number]}
 */
const getBboxFromGeoJSON = (geojson) => turfBbox(geojson)

/**
 * Returns true if the geometry's screen bounding box overlaps the given panel rectangle.
 * Used to decide whether to pan/zoom when a panel opens over a visibleGeometry target.
 *
 * @param {object} geojson - GeoJSON Feature, FeatureCollection, or geometry
 * @param {DOMRect} panelRect - Bounding rect of the panel element (viewport coordinates)
 * @param {object} map - MapLibre map instance
 * @returns {boolean}
 */
const isGeometryObscured = (geojson, panelRect, map) => {
  const containerRect = map.getContainer().getBoundingClientRect()
  const [west, south, east, north] = getBboxFromGeoJSON(geojson)

  const corners = [
    map.project([west, south]),
    map.project([west, north]),
    map.project([east, south]),
    map.project([east, north])
  ]

  const screenMinX = Math.min(...corners.map(corner => corner.x))
  const screenMaxX = Math.max(...corners.map(corner => corner.x))
  const screenMinY = Math.min(...corners.map(corner => corner.y))
  const screenMaxY = Math.max(...corners.map(corner => corner.y))

  // Convert panelRect from viewport coords to map-container-relative coords
  const panelLeft = panelRect.left - containerRect.left
  const panelTop = panelRect.top - containerRect.top
  const panelRight = panelRect.right - containerRect.left
  const panelBottom = panelRect.bottom - containerRect.top

  return (
    screenMinX < panelRight &&
    screenMaxX > panelLeft &&
    screenMinY < panelBottom &&
    screenMaxY > panelTop
  )
}

export {
  getAreaDimensions,
  getCardinalMove,
  getBboxFromGeoJSON,
  isGeometryObscured,
  getResolution,
  getPaddedBounds,
  formatDimension
}
