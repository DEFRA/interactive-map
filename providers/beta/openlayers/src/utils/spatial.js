import turfBbox from '@turf/bbox'

// In EPSG:27700 coordinates are projected metres — distances are Pythagorean, no geodesy needed

const formatDimension = (metres) => {
  const WHOLE_MILE_THRESHOLD = 10
  const MILE_THRESHOLD = 0.5
  const METRES_PER_MILE = 1609.344

  const miles = metres / METRES_PER_MILE

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

/**
 * Returns "400 metres by 1.4 miles" for the visible (padded) map area.
 * extent: [xmin, ymin, xmax, ymax] in EPSG:27700 metres
 */
const getAreaDimensions = (extent) => {
  if (!extent) {
    return ''
  }
  const [xmin, ymin, xmax, ymax] = extent
  const widthMetres = xmax - xmin
  const heightMetres = ymax - ymin
  return `${formatDimension(heightMetres)} by ${formatDimension(widthMetres)}`
}

/**
 * Returns "north 400 metres, east 750 metres" for moves between two EPSG:27700 [easting, northing] coords.
 */
const getCardinalMove = (from, to) => {
  const THRESHOLD_METRES = 1

  const dEasting = to[0] - from[0]
  const dNorthing = to[1] - from[1]

  const moves = []

  if (Math.abs(dNorthing) > THRESHOLD_METRES) {
    moves.push(`${dNorthing > 0 ? 'north' : 'south'} ${formatDimension(Math.abs(dNorthing))}`)
  }

  if (Math.abs(dEasting) > THRESHOLD_METRES) {
    moves.push(`${dEasting > 0 ? 'east' : 'west'} ${formatDimension(Math.abs(dEasting))}`)
  }

  return moves.join(', ')
}

/**
 * Get a flat extent [xmin, ymin, xmax, ymax] from any GeoJSON object.
 * GeoJSON fed into the OL provider is already in EPSG:27700 (the view's native
 * CRS), not WGS84, so this is a straight bbox — no reprojection.
 */
const getExtentFromGeoJSON = (geojson) => turfBbox(geojson)

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
 * getPixelFromCoordinate returns layout-space pixels (unscaled canvas), so we convert them
 * to screen space using the ratio between the viewport's visual size and the canvas size.
 * This accounts for the CSS scale transform applied on medium/large mapSize.
 */
const isGeometryObscured = (geojson, panelRect, map) => {
  const containerRect = map.getTargetElement().getBoundingClientRect()
  if (!containerRect.width || !containerRect.height) {
    return false
  }
  const viewportRect = map.getViewport().getBoundingClientRect()
  const scaleX = viewportRect.width / containerRect.width
  const scaleY = viewportRect.height / containerRect.height

  const [xmin, ymin, xmax, ymax] = getExtentFromGeoJSON(geojson)

  const corners = [[xmin, ymin], [xmin, ymax], [xmax, ymin], [xmax, ymax]].map(coord => {
    return map.getPixelFromCoordinate(coord)
  }).filter(Boolean)

  if (!corners.length) {
    return false
  }

  const screenMinX = containerRect.left + Math.min(...corners.map(c => c[0])) * scaleX
  const screenMaxX = containerRect.left + Math.max(...corners.map(c => c[0])) * scaleX
  const screenMinY = containerRect.top + Math.min(...corners.map(c => c[1])) * scaleY
  const screenMaxY = containerRect.top + Math.max(...corners.map(c => c[1])) * scaleY

  return (
    screenMinX < panelRect.right &&
    screenMaxX > panelRect.left &&
    screenMinY < panelRect.bottom &&
    screenMaxY > panelRect.top
  )
}

export {
  getAreaDimensions,
  getCardinalMove,
  getExtentFromGeoJSON,
  getPaddedExtent,
  isGeometryObscured,
  formatDimension
}
