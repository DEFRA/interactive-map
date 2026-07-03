import Draw from 'ol/interaction/Draw.js'
import { noModifierKeys } from 'ol/events/condition.js'
import { createDrawInput } from './drawInput.js'
import { getCoords } from '../utils/geometryHelpers.js'
import { TOLERANCES } from '../defaults.js'
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
  let currentSketchStyle = manager.styles.createSketchStyle(geometryType)

  const drawInteraction = new Draw({
    type: geometryType,
    style: (feature) => currentSketchStyle(feature),
    stopClick: true,
    snapTolerance: TOLERANCES.snapRadius,
    condition: buildCondition(map, geometryType, () => sketchFeature)
  })
  map.addInteraction(drawInteraction)

  // Update sketch style when map style changes
  const onStylesChanged = () => {
    currentSketchStyle = manager.styles.createSketchStyle(geometryType)
    drawInteraction.overlay_.changed()
  }
  manager.on('styleschanged', onStylesChanged)
  // OL internal: overlay_ is the private VectorLayer used for the sketch geometry.
  // updateWhileAnimating_ forces per-frame redraws during view animations (keyboard pan).
  // Without this, geom.setCoordinates() calls are ignored while the ANIMATING hint is set.
  // Check ol/interaction/Draw.js and ol/layer/BaseVector.js if this breaks after an OL upgrade.
  drawInteraction.overlay_.updateWhileAnimating_ = true

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
      manager.off('styleschanged', onStylesChanged)
      // Emit the final interfaceType from draw mode so it's synced back to appState
      // This ensures crosshair visibility is correct when exiting draw mode
      manager.emit('interfacetypechange', { interfaceType: input.getInterfaceType() })
      input.destroy()
      map.removeInteraction(drawInteraction)
      sketchFeature = null
    }
  }
}
