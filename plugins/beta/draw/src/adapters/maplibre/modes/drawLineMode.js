import DrawLineString from '../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/draw_line_string.js'
import { isValidLineClick } from '../../../utils/spatial.js'
import { createDrawMode } from './createDrawMode.js'

export const DrawLineMode = createDrawMode(DrawLineString, {
  featureProp: 'line',
  geometryType: 'LineString',
  getCoords: (feature) => feature.coordinates,
  validateClick: (feature) => isValidLineClick(feature.coordinates),
  excludeFeatureIdFromSetup: true, // DrawLineString interprets featureId as "continue existing"
  finishOnInvalidClick: true, // Clicking same spot (like double-click) finishes the line
  // Display coords during drawing: [v0...vN, rubber_band]
  getPlacedCoords: (geojson) => geojson.geometry.coordinates.slice(0, -1)
})
