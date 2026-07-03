import DrawPolygon from '../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/draw_polygon.js'
import { isValidClick } from '../../../utils/spatial.js'
import { createDrawMode } from './createDrawMode.js'

export const DrawPolygonMode = createDrawMode(DrawPolygon, {
  featureProp: 'polygon',
  geometryType: 'Polygon',
  getCoords: (feature) => feature.coordinates[0],
  validateClick: (feature) => isValidClick(feature.coordinates),
  // Display ring during drawing: [v0...vN, rubber_band, v0_closing]
  getPlacedCoords: (geojson) => geojson.geometry.coordinates[0].slice(0, -2)
})
