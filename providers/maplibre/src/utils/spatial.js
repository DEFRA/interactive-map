// src/utils/spatial.js
import LatLon from 'geodesy/latlon-spherical.js'

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

  if (miles < MILE_THRESHOLD / METERS_PER_MILE) {
    return `${Math.round(meters)}m`
  }

  if (miles < WHOLE_MILE_THRESHOLD) {
    const value = Number.parseFloat(miles.toFixed(1))
    const units = value === 1 ? 'mile' : 'miles'
    return `${value} ${units}`
  }

  const rounded = Math.round(miles)
  const unit = rounded === 1 ? 'mile' : 'miles'
  return `${rounded} ${unit}`
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

/**
 * Find the index of the nearest pixel in a given cardinal direction.
 *
 * The function:
 * - Filters candidate points that lie in the specified direction
 *   (up, down, left, right) relative to a start pixel.
 * - Selects the nearest valid candidate using Euclidean distance.
 * - Falls back to returning the start pixel index if no candidate exists.
 *
 * Example:
 *   spatialNavigate('up', [100, 200], [[100, 100], [150, 250], [90, 180]])
 *   → returns the index of [100, 100]
 *
 * @param {'ArrowUp'|'ArrowDown'|'ArrowLeft'|'ArrowRight'} direction - The direction to search.
 * @param {[number, number]} start - The starting pixel coordinate [x, y].
 * @param {Array<[number, number]>} pixels - Array of pixel coordinates.
 * @returns {number} Index of the closest pixel in the given direction.
 */
const isInDirection = (direction, dx, dy) => {
  switch (direction) {
    case 'ArrowUp': return dy < 0 && Math.abs(dy) >= Math.abs(dx)
    case 'ArrowDown': return dy > 0 && Math.abs(dy) >= Math.abs(dx)
    case 'ArrowLeft': return dx < 0 && Math.abs(dx) > Math.abs(dy)
    case 'ArrowRight': return dx > 0 && Math.abs(dx) > Math.abs(dy)
    default: return false
  }
}

const spatialNavigate = (direction, start, pixels) => {
  const [sx, sy] = start

  // Direction filters
  const candidates = pixels.filter(([x, y]) => {
    if (x === sx && y === sy) {
      return false
    }
    return isInDirection(direction, x - sx, y - sy)
  })

  if (!candidates.length) {
    return pixels.findIndex(p => p[0] === sx && p[1] === sy)
  }

  // Choose the closest by Euclidean distance
  let closestIndex = -1
  let minDist = Infinity
  candidates.forEach(c => {
    const dx = c[0] - sx
    const dy = c[1] - sy
    const dist = dx * dx + dy * dy // squared distance is enough
    if (dist < minDist) {
      minDist = dist
      closestIndex = pixels.indexOf(c)
    }
  })

  return closestIndex
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


export {
  getAreaDimensions,
  getCardinalMove,
  spatialNavigate,
  getResolution,
  getPaddedBounds
}
