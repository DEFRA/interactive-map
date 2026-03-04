import Extent from '@arcgis/core/geometry/Extent.js'
import Point from '@arcgis/core/geometry/Point.js'
import { getBboxFromGeoJSON } from './coords.js'

// -----------------------------------------------------------------------------
// Internal (not exported)
// -----------------------------------------------------------------------------

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
 * Returns a string like "height by width" for an Esri Extent in 27700
 * @param {Extent} extent - The Esri extent (projected in meters)
 * @returns {string}
 */
const getAreaDimensions = (extent) => {
  if (!extent || !(extent instanceof Extent)) {
    return ''
  }

  const west = extent.xmin
  const south = extent.ymin
  const east = extent.xmax
  const north = extent.ymax

  // Width: west <-> east
  const widthMeters = east - west
  // Height: south <-> north
  const heightMeters = north - south

  const widthLabel = formatDimension(widthMeters)
  const heightLabel = formatDimension(heightMeters)

  return `${heightLabel} by ${widthLabel}`
}

/**
 * Generate a cardinal direction move description for projected coordinates (e.g., EPSG:27700)
 * Only non-zero moves are announced.
 * Example: "north 400m", "east 750m", or "south 400m, west 750m"
 * @param {number[]} from - [easting, northing]
 * @param {number[]} to - [easting, northing]
 * @returns {string}
 */
function getCardinalMove(from, to) {
  const [x1, y1] = from
  const [x2, y2] = to

  const dX = x2 - x1
  const dY = y2 - y1

  const moves = []

  // Threshold to ignore tiny movements (in meters)
  const THRESHOLD = 0.1

  if (Math.abs(dY) > THRESHOLD) {
    moves.push(`${dY > 0 ? 'north' : 'south'} ${formatDimension(Math.abs(dY))}`)
  }

  if (Math.abs(dX) > THRESHOLD) {
    moves.push(`${dX > 0 ? 'east' : 'west'} ${formatDimension(Math.abs(dX))}`)
  }

  return moves.join(', ')
}

/**
 * Returns the current map extent adjusted for padding
 * @param {MapView|SceneView} view - The Esri view
 * @param {Object} padding - Optional: { top, right, bottom, left } in pixels
 * @returns {Extent} - Padded extent
 */
const DEFAULT_PADDING = { top: 0, right: 0, bottom: 0, left: 0 }

const getPaddedExtent = (view, padding = DEFAULT_PADDING) => {
  if (!view.container) {
    return null
  }

  const { width, height } = view.container.getBoundingClientRect()

  // Screen coordinates of the visible (unpadded) corners
  const swScreen = { x: padding.left, y: height - padding.bottom }
  const neScreen = { x: width - padding.right, y: padding.top }

  // Convert screen coordinates to map coordinates
  const swMap = view.toMap(swScreen)
  const neMap = view.toMap(neScreen)

  // Return an Esri Extent
  return new Extent({
    xmin: swMap.x,
    ymin: swMap.y,
    xmax: neMap.x,
    ymax: neMap.y,
    spatialReference: swMap.spatialReference
  })
}


/**
 * Returns true if the geometry's screen bounding box overlaps the given panel rectangle.
 * Used to decide whether to pan/zoom when a panel opens over a visibleGeometry target.
 *
 * @param {object} geojson - GeoJSON Feature, FeatureCollection, or geometry
 * @param {DOMRect} panelRect - Bounding rect of the panel element (viewport coordinates)
 * @param {import('@arcgis/core/views/MapView.js').default} view - ESRI MapView instance
 * @returns {boolean}
 */
const isGeometryObscured = (geojson, panelRect, view) => {
  if (!view?.container) {
    return false
  }

  const containerRect = view.container.getBoundingClientRect()
  const extent = getBboxFromGeoJSON(geojson)

  const corners = [
    view.toScreen(new Point({ x: extent.xmin, y: extent.ymin, spatialReference: extent.spatialReference })),
    view.toScreen(new Point({ x: extent.xmin, y: extent.ymax, spatialReference: extent.spatialReference })),
    view.toScreen(new Point({ x: extent.xmax, y: extent.ymin, spatialReference: extent.spatialReference })),
    view.toScreen(new Point({ x: extent.xmax, y: extent.ymax, spatialReference: extent.spatialReference }))
  ]

  const screenMinX = Math.min(...corners.map(c => c.x))
  const screenMaxX = Math.max(...corners.map(c => c.x))
  const screenMinY = Math.min(...corners.map(c => c.y))
  const screenMaxY = Math.max(...corners.map(c => c.y))

  // Convert panelRect from viewport coords to view-container-relative coords
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
  getPaddedExtent,
  isGeometryObscured
}
