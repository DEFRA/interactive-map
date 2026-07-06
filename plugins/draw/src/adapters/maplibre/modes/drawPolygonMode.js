import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { isValidClick } from '../../../utils/spatial.js'
import { createDrawMode } from './createDrawMode.js'

// During drawing the ring is [v0...vN, rubber_band, v0_closing]; the last two are not placed vertices
const RUBBER_BAND_AND_CLOSING = 2

// Extend the built-in mode via the package's public API (MapboxDraw.modes) rather than a deep internal import
export const DrawPolygonMode = createDrawMode(MapboxDraw.modes.draw_polygon, {
  featureProp: 'polygon',
  geometryType: 'Polygon',
  getCoords: (feature) => feature.coordinates[0],
  validateClick: (feature) => isValidClick(feature.coordinates),
  // Display ring during drawing: [v0...vN, rubber_band, v0_closing]
  getPlacedCoords: (geojson) => geojson.geometry.coordinates[0].slice(0, -RUBBER_BAND_AND_CLOSING)
})
