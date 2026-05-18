import Draw from 'ol/interaction/Draw.js'
import { createDrawInput } from './drawInput.js'

const DEBOUNCE_MS = 5
const MIN_POLYGON_VERTICES = 3
const MIN_LINE_VERTICES = 2

const countSketchVertices = (geometryType, rawCoords) => {
  if (geometryType === 'Polygon' && rawCoords.length > 0) {
    return Math.max(0, rawCoords[0].length - 2)
  } else if (geometryType === 'LineString') {
    return Math.max(0, rawCoords.length - 1)
  } else {
    return 0
  }
}

const wireDrawEvents = ({ drawInteraction, geometryType, featureId, properties, manager }) => {
  let sketchFeature = null
  let pendingVertexUpdate = null

  const clearPending = () => {
    if (pendingVertexUpdate) {
      clearTimeout(pendingVertexUpdate)
      pendingVertexUpdate = null
    }
  }

  const updateVertexCount = () => {
    if (!sketchFeature) {
      return
    }
    const rawCoords = sketchFeature.getGeometry().getCoordinates()
    manager.emit('vertexchange', { numVertecies: countSketchVertices(geometryType, rawCoords) })
  }

  drawInteraction.on('drawstart', (e) => {
    sketchFeature = e.feature
    sketchFeature.getGeometry().on('change', () => {
      clearPending()
      pendingVertexUpdate = setTimeout(() => { updateVertexCount(); pendingVertexUpdate = null }, DEBOUNCE_MS)
    })
  })

  drawInteraction.on('drawend', (e) => {
    clearPending()
    const olFeature = e.feature
    olFeature.setId(String(featureId))
    olFeature.setProperties(properties)
    manager.store.source.addFeature(olFeature)
    manager.emit('create', manager.store.toGeoJSON(olFeature))
  })

  drawInteraction.on('drawabort', () => {
    clearPending()
    manager.emit('cancel')
  })

  return {
    getSketchFeature: () => sketchFeature,
    updateVertexCount,
    clear () { sketchFeature = null }
  }
}

/**
 * Draw mode — handles draw_polygon and draw_line.
 *
 * OL's Draw interaction handles all pointer/mouse behaviour natively.
 * drawInput.js handles touch/keyboard/button input.
 *
 * @returns {{ done, cancel, undo, destroy }}
 */
export const createDrawMode = ({ map, manager, options }) => {
  const { geometryType, featureId, properties = {}, container, interfaceType, addVertexButtonId, mapProvider, crossHair } = options

  const drawInteraction = new Draw({
    type: geometryType,
    style: manager.styles.createSketchStyle(),
    stopClick: true,
    snapTolerance: 12
  })
  map.addInteraction(drawInteraction)

  const handlers = wireDrawEvents({ drawInteraction, geometryType, featureId, properties, manager })
  const input = createDrawInput({ drawInteraction, manager, options: { container, interfaceType, addVertexButtonId, mapProvider, crossHair } })

  return {
    done () {
      const sketch = handlers.getSketchFeature()
      if (sketch) {
        const numVertecies = countSketchVertices(geometryType, sketch.getGeometry().getCoordinates())
        const minVertices = geometryType === 'Polygon' ? MIN_POLYGON_VERTICES : MIN_LINE_VERTICES
        if (numVertecies < minVertices) {
          return
        }
      }
      drawInteraction.finishDrawing()
    },
    cancel () { drawInteraction.abortDrawing() },
    undo () { drawInteraction.removeLastPoint(); handlers.updateVertexCount() },
    destroy () { input.destroy(); map.removeInteraction(drawInteraction); handlers.clear() }
  }
}
