import Draw from 'ol/interaction/Draw.js'
import { createSketchStyle } from '../core/styles.js'
import { createDrawInput } from './drawInput.js'

/**
 * Draw mode — handles draw_polygon and draw_line.
 *
 * OL's Draw interaction handles all pointer/mouse behaviour natively.
 * drawInput.js handles touch/keyboard/button input.
 *
 * @returns {{ done, cancel, undo, destroy }}
 */
export const createDrawMode = ({ map, manager, options }) => {
  const {
    geometryType,    // 'Polygon' | 'LineString'
    featureId,
    properties = {},
    container,
    interfaceType,
    addVertexButtonId,
    mapProvider,
    crossHair
  } = options

  const drawInteraction = new Draw({
    type: geometryType,
    style: createSketchStyle(),
    stopClick: true,
    // minPoints defaults: 3 for Polygon, 2 for LineString — OL handles this
    // snapTolerance: how close to first point to auto-close polygon
    snapTolerance: 12
  })
  map.addInteraction(drawInteraction)

  // Track vertex count for the Done button enabled state
  let sketchFeature = null
  let pendingVertexUpdate = null

  const updateVertexCount = () => {
    if (!sketchFeature) return
    const geom = sketchFeature.getGeometry()
    const rawCoords = geom.getCoordinates()

    let numVertecies = 0

    if (geometryType === 'Polygon' && rawCoords.length > 0) {
      // For Polygon, OL stores rings as [[x1,y1], [x2,y2], ..., [x1,y1], rubber-band]
      // Subtract 2: 1 for closing vertex + 1 for rubber-band
      const exteriorRing = rawCoords[0]
      numVertecies = Math.max(0, exteriorRing.length - 2)
    } else if (geometryType === 'LineString') {
      // For LineString, subtract 1 for rubber-band coordinate
      numVertecies = Math.max(0, rawCoords.length - 1)
    }

    manager.emit('vertexchange', { numVertecies })
  }

  const onGeometryChange = () => {
    // Debounce geometry changes to avoid intermediate states
    if (pendingVertexUpdate) {
      clearTimeout(pendingVertexUpdate)
    }
    pendingVertexUpdate = setTimeout(() => {
      updateVertexCount()
      pendingVertexUpdate = null
    }, 5)
  }

  drawInteraction.on('drawstart', (e) => {
    sketchFeature = e.feature
    sketchFeature.getGeometry().on('change', onGeometryChange)
  })

  drawInteraction.on('drawend', (e) => {
    if (pendingVertexUpdate) {
      clearTimeout(pendingVertexUpdate)
      pendingVertexUpdate = null
    }
    const olFeature = e.feature
    olFeature.setId(String(featureId))
    olFeature.setProperties(properties)
    manager.store.source.addFeature(olFeature)
    const geojson = manager.store.toGeoJSON(olFeature)
    manager.emit('create', geojson)
    // Mode switches to disabled in events.js after receiving 'create'
  })

  drawInteraction.on('drawabort', () => {
    if (pendingVertexUpdate) {
      clearTimeout(pendingVertexUpdate)
      pendingVertexUpdate = null
    }
    manager.emit('cancel')
  })

  const input = createDrawInput({ drawInteraction, manager, options: { container, interfaceType, addVertexButtonId, mapProvider, crossHair } })

  return {
    done () {
      // Validate minimum points before finishing
      if (sketchFeature) {
        const geom = sketchFeature.getGeometry()
        const rawCoords = geom.getCoordinates()
        let numVertecies = 0

        if (geometryType === 'Polygon' && rawCoords.length > 0) {
          const exteriorRing = rawCoords[0]
          numVertecies = Math.max(0, exteriorRing.length - 2)
        } else if (geometryType === 'LineString') {
          numVertecies = Math.max(0, rawCoords.length - 1)
        }

        // Need at least 3 vertices for Polygon, 2 for LineString
        const minVertices = geometryType === 'Polygon' ? 3 : 2
        if (numVertecies < minVertices) return
      }
      drawInteraction.finishDrawing()
    },

    cancel () {
      drawInteraction.abortDrawing()
    },

    undo () {
      drawInteraction.removeLastPoint()
      updateVertexCount()
    },

    destroy () {
      input.destroy()
      map.removeInteraction(drawInteraction)
      sketchFeature = null
    }
  }
}
