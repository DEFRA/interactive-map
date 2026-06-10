import MapboxDraw from '@mapbox/mapbox-gl-draw'

const DrawPolygon = MapboxDraw.modes.draw_polygon
import { isValidClick } from '../utils/spatial.js'
import { createDrawMode } from './createDrawMode.js'

export const DrawPolygonMode = createDrawMode(DrawPolygon, {
  featureProp: 'polygon',
  geometryType: 'Polygon',
  getCoords: (feature) => feature.coordinates[0],
  validateClick: (feature) => isValidClick(feature.coordinates),
  createVertices: (geojson, display, createVertex) => {
    const ring = geojson.geometry.coordinates[0]
    for (let i = 1; i < ring.length - 2; i++) {
      display(createVertex(geojson.id, ring[i], `0.${i}`))
    }
  }
})
