import Draw from 'ol/interaction/Draw.js'
import { createDrawInput } from './drawInput.js'
import { getCoords } from '../utils/geometryHelpers.js'

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
    geometryType, // 'Polygon' | 'LineString'
    featureId,
    properties = {},
    container,
    interfaceType,
    addVertexButtonId,
    mapProvider,
    snap
  } = options

  const drawInteraction = new Draw({
    type: geometryType,
    style: manager.styles.createSketchStyle(),
    stopClick: true,
    // minPoints defaults: 3 for Polygon, 2 for LineString — OL handles this
    // snapTolerance: how close to first point to auto-close polygon
    snapTolerance: 12
  })
  map.addInteraction(drawInteraction)

  // Track vertex count for the Done button enabled state
  let sketchFeature = null

  const updateVertexCount = () => {
    if (!sketchFeature) {
      return
    }
    const geom = sketchFeature.getGeometry()
    const coords = getCoords({ type: geometryType, coordinates: geom.getCoordinates() })
    // OL always keeps a trailing rubber-band coordinate; subtract 1
    const numVertices = Math.max(0, coords.length - 1)
    manager.emit('vertexchange', { numVertices })
  }

  drawInteraction.on('drawstart', (e) => {
    sketchFeature = e.feature
    sketchFeature.getGeometry().on('change', updateVertexCount)
  })

  drawInteraction.on('drawend', (e) => {
    const olFeature = e.feature
    olFeature.setId(String(featureId))
    olFeature.setProperties(properties)
    manager.store.source.addFeature(olFeature)
    const geojson = manager.store.toGeoJSON(olFeature)
    manager.emit('create', geojson)
    // Mode switches to disabled in events.js after receiving 'create'
  })

  drawInteraction.on('drawabort', () => {
    manager.emit('cancel')
  })

  const input = createDrawInput({
    drawInteraction,
    manager,
    options: {
      container,
      interfaceType,
      addVertexButtonId,
      mapProvider,
      snap,
      onUndo: () => {
        drawInteraction.removeLastPoint()
        updateVertexCount()
      }
    }
  })

  return {
    done () {
      // Validate minimum points before finishing
      if (sketchFeature) {
        const geom = sketchFeature.getGeometry()
        const coords = getCoords({ type: geometryType, coordinates: geom.getCoordinates() })
        const min = geometryType === 'Polygon' ? 4 : 3 // +1 for rubber band
        if (coords.length < min) {
          return
        }
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
