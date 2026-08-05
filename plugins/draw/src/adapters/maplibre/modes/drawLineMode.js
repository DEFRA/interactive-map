import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { isValidLineClick } from '../../../utils/spatial.js'
import { createDrawMode } from './createDrawMode.js'

// Extend the built-in mode via the package's public API (MapboxDraw.modes) rather than a deep internal import
export const DrawLineMode = createDrawMode(MapboxDraw.modes.draw_line_string, {
  featureProp: 'line',
  geometryType: 'LineString',
  getCoords: (feature) => feature.coordinates,
  validateClick: (feature) => isValidLineClick(feature.coordinates),
  excludeFeatureIdFromSetup: true, // DrawLineString interprets featureId as "continue existing"
  finishOnInvalidClick: true, // Clicking same spot (like double-click) finishes the line
  // Display coords during drawing: [v0...vN, rubber_band]
  getPlacedCoords: (geojson) => geojson.geometry.coordinates.slice(0, -1)
})
