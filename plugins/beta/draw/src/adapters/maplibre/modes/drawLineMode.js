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
  createVertices: (geojson, display, createVertex) => {
    // Coords during drawing: [v0...vN, rubber_band].
    // Parent mode already displays vN (last placed) — fill in v0 and the middle vertices
    const coords = geojson.geometry.coordinates
    for (let i = 0; i < coords.length - 2; i++) {
      display(createVertex(geojson.properties.id, coords[i], `${i}`, false))
    }
  }
})
