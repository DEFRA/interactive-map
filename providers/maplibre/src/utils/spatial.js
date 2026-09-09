// src/utils/spatial.js
import LatLon from 'geodesy/latlon-spherical.js'
import turfBbox from '@turf/bbox'

// -----------------------------------------------------------------------------
// Internal (not exported)
// -----------------------------------------------------------------------------

/**
 * Calculate distance in meters between two [lng, lat] coordinates
 */
const getDistance = (from, to) => {
  const [lng1, lat1] = from
  const [lng2, lat2] = to

  const fromLatLon = new LatLon(lat1, lng1)
  const toLatLon = new LatLon(lat2, lng2)

  return fromLatLon.distanceTo(toLatLon) // meters
}

/**
 * Format dimension, meters if less than 0.5 miles, otherwise miles
 */
const formatDimension = (meters) => {
  const WHOLE_MILE_THRESHOLD = 10
  const MILE_THRESHOLD = 0.5
  const METERS_PER_MILE = 1609.344

  const miles = meters / METERS_PER_MILE

  // Check if we are under the half-mile threshold
  if (miles < MILE_THRESHOLD) {
    const roundedMeters = Math.round(meters)
    const units = roundedMeters === 1 ? 'metre' : 'metres'
    return `${roundedMeters} ${units}`
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
 * Returns: "400m by 1.4 miles"
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
  const widthMeters = getDistance([west, south], [east, south])
  // Height: south <-> north at the western longitude
  const heightMeters = getDistance([west, south], [west, north])

  const widthLabel = formatDimension(widthMeters)
  const heightLabel = formatDimension(heightMeters)

  return `${heightLabel} by ${widthLabel}`
}

/**
 * Generate a cardinal direction move description.
 * Only non-zero moves are announced.
 * Example: "north 400m", "east 750m", or "south 400m, west 750m"
 */
const getCardinalMove = (from, to) => {
  const [lng1, lat1] = from
  const [lng2, lat2] = to

  const dLat = lat2 - lat1
  const dLng = lng2 - lng1

  const moves = []

  if (Math.abs(dLat) > 0.0001) { // threshold to ignore tiny movement
    const meters = Math.round(getDistance([lng1, lat1], [lng1, lat2]))
    moves.push(`${dLat > 0 ? 'north' : 'south'} ${formatDimension(meters)}`)
  }

  if (Math.abs(dLng) > 0.0001) {
    const meters = Math.round(getDistance([lng1, lat1], [lng2, lat1]))
    moves.push(`${dLng > 0 ? 'east' : 'west'} ${formatDimension(meters)}`)
  }

  return moves.join(', ')
}

const getResolution = (center, zoom) => {
  const EARTH_CIRCUMFERENCE = 40075016.686
  const TILE_SIZE = 512
  const lat = center.lat
  const scale = Math.pow(2, zoom)
  const resolution = (EARTH_CIRCUMFERENCE * Math.cos((lat * Math.PI) / 180)) / (scale * TILE_SIZE) // NOSONAR - 180 is degrees-to-radians conversion
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

  const screenMinX = Math.min(...corners.map(c => c.x))
  const screenMaxX = Math.max(...corners.map(c => c.x))
  const screenMinY = Math.min(...corners.map(c => c.y))
  const screenMaxY = Math.max(...corners.map(c => c.y))

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
