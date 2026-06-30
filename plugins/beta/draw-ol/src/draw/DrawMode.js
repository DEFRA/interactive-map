import Draw from 'ol/interaction/Draw.js'
import { noModifierKeys } from 'ol/events/condition.js'
import { createDrawInput } from './drawInput.js'
import { getCoords } from '../utils/geometryHelpers.js'

const SNAP_TOLERANCE_PX = 12
const MIN_VERTICES = { Polygon: 3, LineString: 2 }

const canFinish = (geometryType, sketchFeature) => {
  if (!sketchFeature) { return false }
  const geom = sketchFeature.getGeometry()
  const coords = getCoords({ type: geometryType, coordinates: geom.getCoordinates() })
  // OL keeps a trailing rubber-band coordinate; subtract 1 to get real vertex count
  return coords.length - 1 >= MIN_VERTICES[geometryType]
}

// OL closes Polygon rings by appending v1: [...placed, rubber_band, v1_closing]; last placed is 3 from end.
const POLY_LAST_PLACED_OFFSET = 3

const getLastPlacedCoord = (geom) => {
  if (geom.getType() === 'Polygon') {
    const ring = geom.getCoordinates()[0] || []
    return ring.length >= POLY_LAST_PLACED_OFFSET ? ring[ring.length - POLY_LAST_PLACED_OFFSET] : null
  }
  const coords = geom.getCoordinates()
  return coords.length >= 2 ? coords[coords.length - 2] : null
}

const DUPLICATE_TOLERANCE_PX = 2

const buildCondition = (map, geometryType, getSketchFeature) => (e) => {
  if (!noModifierKeys(e)) { return false }
  const sf = getSketchFeature()
  if (!sf || canFinish(geometryType, sf)) { return true }
  const prev = getLastPlacedCoord(sf.getGeometry())
  if (!prev) { return true }
  const pp = map.getPixelFromCoordinate(prev)
  if (!pp) { return true }
  const dx = e.pixel[0] - pp[0]; const dy = e.pixel[1] - pp[1]
  return dx * dx + dy * dy > DUPLICATE_TOLERANCE_PX * DUPLICATE_TOLERANCE_PX
}

export const createDrawMode = ({ map, manager, options }) => {
  const {
    geometryType,
    featureId,
    properties = {},
    container,
    interfaceType,
    addVertexButtonId,
    mapProvider,
    snap
  } = options

  let sketchFeature = null

  const drawInteraction = new Draw({
    type: geometryType,
    style: manager.styles.createSketchStyle(),
    stopClick: true,
    snapTolerance: SNAP_TOLERANCE_PX,
    condition: buildCondition(map, geometryType, () => sketchFeature)
  })
  map.addInteraction(drawInteraction)

  const updateVertexCount = () => {
    if (!sketchFeature) { return }
    const geom = sketchFeature.getGeometry()
    const coords = getCoords({ type: geometryType, coordinates: geom.getCoordinates() })
    // OL always keeps a trailing rubber-band coordinate; subtract 1
    manager.emit('vertexchange', { numVertices: Math.max(0, coords.length - 1) })
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
    manager.emit('create', manager.store.toGeoJSON(olFeature))
    // Mode switches to disabled in events.js after receiving 'create'
  })

  drawInteraction.on('drawabort', () => { manager.emit('cancel') })

  const input = createDrawInput({
    drawInteraction,
    manager,
    options: {
      container,
      interfaceType,
      addVertexButtonId,
      mapProvider,
      snap,
      onUndo: () => { drawInteraction.removeLastPoint(); updateVertexCount() },
      canFinish: () => canFinish(geometryType, sketchFeature)
    }
  })

  return {
    done () {
      if (canFinish(geometryType, sketchFeature)) { drawInteraction.finishDrawing() }
    },
    cancel () { drawInteraction.abortDrawing() },
    undo () { drawInteraction.removeLastPoint(); updateVertexCount() },
    destroy () {
      input.destroy()
      map.removeInteraction(drawInteraction)
      sketchFeature = null
    }
  }
}
