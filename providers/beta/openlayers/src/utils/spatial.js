import turfBbox from '@turf/bbox'
import { transform, transformExtent } from 'ol/proj.js'

// In EPSG:27700 coordinates are projected meters — distances are Pythagorean, no geodesy needed

const formatDimension = (meters) => {
  const WHOLE_MILE_THRESHOLD = 10
  const MILE_THRESHOLD = 0.5
  const METERS_PER_MILE = 1609.344

  const miles = meters / METERS_PER_MILE

  if (miles < MILE_THRESHOLD) {
    return `${Math.round(meters)}m`
  }

  if (miles < WHOLE_MILE_THRESHOLD) {
    const value = Number.parseFloat(miles.toFixed(1))
    const units = value === 1 ? 'mile' : 'miles'
    return `${value} ${units}`
  }

  const rounded = Math.round(miles)
  return `${rounded} miles`
}

/**
 * Returns "400m by 1.4 miles" for the visible (padded) map area.
 * extent: [xmin, ymin, xmax, ymax] in EPSG:27700 meters
 */
const getAreaDimensions = (extent) => {
  if (!extent) {
    return ''
  }
  const [xmin, ymin, xmax, ymax] = extent
  const widthMeters = xmax - xmin
  const heightMeters = ymax - ymin
  return `${formatDimension(heightMeters)} by ${formatDimension(widthMeters)}`
}

/**
 * Returns "north 400m, east 750m" for moves between two EPSG:27700 [easting, northing] coords.
 */
const getCardinalMove = (from, to) => {
  const THRESHOLD_METERS = 1

  const dEasting = to[0] - from[0]
  const dNorthing = to[1] - from[1]

  const moves = []

  if (Math.abs(dNorthing) > THRESHOLD_METERS) {
    moves.push(`${dNorthing > 0 ? 'north' : 'south'} ${formatDimension(Math.abs(dNorthing))}`)
  }

  if (Math.abs(dEasting) > THRESHOLD_METERS) {
    moves.push(`${dEasting > 0 ? 'east' : 'west'} ${formatDimension(Math.abs(dEasting))}`)
  }

  return moves.join(', ')
}

/**
 * Get a flat bbox [west, south, east, north] in WGS84 from any GeoJSON object.
 */
const getBboxFromGeoJSON = (geojson) => turfBbox(geojson)

/**
 * Get a flat extent [xmin, ymin, xmax, ymax] in EPSG:27700 from any GeoJSON object.
 * GeoJSON is always WGS84, so this transforms the bbox.
 */
const getExtentFromGeoJSON = (geojson) => {
  const wgs84Bbox = turfBbox(geojson)
  return transformExtent(wgs84Bbox, 'EPSG:4326', 'EPSG:27700')
}

/**
 * Returns the visible (padded) extent [xmin, ymin, xmax, ymax] in EPSG:27700.
 * Accounts for view padding by converting padded pixel corners to map coordinates.
 */
const getPaddedExtent = (map) => {
  const size = map.getSize()
  const view = map.getView()
  const padding = view.padding || [0, 0, 0, 0] // [top, right, bottom, left]
  const [top, right, bottom, left] = padding

  const swPixel = [left, size[1] - bottom]
  const nePixel = [size[0] - right, top]

  const sw = map.getCoordinateFromPixel(swPixel)
  const ne = map.getCoordinateFromPixel(nePixel)

  if (!sw || !ne) {
    return null
  }

  return [sw[0], sw[1], ne[0], ne[1]]
}

/**
 * Returns true if the geometry's screen bounding box overlaps the given panel rectangle.
 * GeoJSON coords are expected in WGS84; they are transformed to EPSG:27700 for screen projection.
 */
const isGeometryObscured = (geojson, panelRect, map) => {
  const containerRect = map.getTargetElement().getBoundingClientRect()
  const [west, south, east, north] = getBboxFromGeoJSON(geojson)

  const corners = [
    [west, south], [west, north], [east, south], [east, north]
  ].map(wgs84Coord => {
    const coord27700 = transform(wgs84Coord, 'EPSG:4326', 'EPSG:27700')
    return map.getPixelFromCoordinate(coord27700)
  }).filter(Boolean)

  if (!corners.length) {
    return false
  }

  const screenMinX = Math.min(...corners.map(c => c[0]))
  const screenMaxX = Math.max(...corners.map(c => c[0]))
  const screenMinY = Math.min(...corners.map(c => c[1]))
  const screenMaxY = Math.max(...corners.map(c => c[1]))

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
  getExtentFromGeoJSON,
  getPaddedExtent,
  isGeometryObscured,
  formatDimension
}
