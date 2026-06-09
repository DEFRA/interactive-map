import DrawLineString from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/draw_line_string.js'
import { isValidLineClick } from '../utils/spatial.js'
import { createDrawMode } from './createDrawMode.js'

export const DrawLineMode = createDrawMode(DrawLineString, {
  featureProp: 'line',
  geometryType: 'LineString',
  getCoords: (feature) => feature.coordinates,
  validateClick: (feature) => isValidLineClick(feature.coordinates),
  excludeFeatureIdFromSetup: true, // DrawLineString interprets featureId as "continue existing"
  finishOnInvalidClick: true, // Clicking same spot (like double-click) finishes the line
  createVertices: (geojson, display, createVertex) => {
    const coords = geojson.geometry.coordinates
    for (let i = 1; i < coords.length - 1; i++) {
      display(createVertex(geojson.id, coords[i], `${i}`))
    }
  }
})
