import Draw from 'ol/interaction/Draw.js'
import { noModifierKeys } from 'ol/events/condition.js'
import { createDrawInput } from './drawInput.js'
import { getPlacedSketchCoords, getLastPlacedSketchCoord } from '../utils/sketchHelpers.js'
import { TOLERANCES } from '../defaults.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'
const MIN_VERTICES = { Polygon: 3, LineString: 2 }

const canFinish = (geometryType, sketchFeature) => {
  if (!sketchFeature) { return false }
  return getPlacedSketchCoords(sketchFeature.getGeometry()).length >= MIN_VERTICES[geometryType]
}

const DUPLICATE_TOLERANCE_PX = 2

const buildCondition = (map, geometryType, getSketchFeature) => (e) => {
  if (!noModifierKeys(e)) { return false }
  const sf = getSketchFeature()
  if (!sf || canFinish(geometryType, sf)) { return true }
  const prev = getLastPlacedSketchCoord(sf.getGeometry())
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
  manager.on(STYLES_CHANGED_EVENT, onStylesChanged)
  // OL internal: overlay_ is the private VectorLayer used for the sketch geometry.
  // updateWhileAnimating_ forces per-frame redraws during view animations (keyboard pan).
  // Without this, geom.setCoordinates() calls are ignored while the ANIMATING hint is set.
  // Check ol/interaction/Draw.js and ol/layer/BaseVector.js if this breaks after an OL upgrade.
  drawInteraction.overlay_.updateWhileAnimating_ = true

  const updateVertexCount = () => {
    if (!sketchFeature) { return }
    manager.emit(ADAPTER_EVENTS.VERTEX_CHANGE, { numVertices: getPlacedSketchCoords(sketchFeature.getGeometry()).length })
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
    manager.emit(ADAPTER_EVENTS.CREATE, manager.store.toGeoJSON(olFeature))
    // Mode switches to disabled in events.js after receiving 'create'
  })

  drawInteraction.on('drawabort', () => { manager.emit(ADAPTER_EVENTS.CANCEL) })

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
      manager.off(STYLES_CHANGED_EVENT, onStylesChanged)
      // Emit the final interfaceType from draw mode so it's synced back to appState
      // This ensures crosshair visibility is correct when exiting draw mode
      manager.emit(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: input.getInterfaceType() })
      input.destroy()
      map.removeInteraction(drawInteraction)
      sketchFeature = null
    }
  }
}
