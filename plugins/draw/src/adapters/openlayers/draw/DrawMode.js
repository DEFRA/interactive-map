import Draw from 'ol/interaction/Draw.js'
import { noModifierKeys } from 'ol/events/condition.js'
import { createDrawInput } from './drawInput.js'
import { getPlacedSketchCoords, getLastPlacedSketchCoord } from '../utils/sketchHelpers.js'
import { TOLERANCES } from '../defaults.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'
import { checkPlacement, validatePlacement, MODE_BY_GEOMETRY } from '../../../validation/validateGeometry.js'
import { MIN_VERTICES } from '../../../validation/rules.js'
import { createLiveStroke } from '../../../validation/liveStroke.js'

const canFinish = (geometryType, sketchFeature) => {
  if (!sketchFeature) { return false }
  return getPlacedSketchCoords(sketchFeature.getGeometry()).length >= MIN_VERTICES[geometryType]
}

const DUPLICATE_TOLERANCE_PX = 2

// Blocks clicks with modifier keys, vetoed placements (the vertex never appears —
// see canPlaceVertex in createDrawMode), and duplicate clicks on the last placed
// vertex while the shape is not yet finishable (once finishable, clicking the last
// vertex is OL's finish gesture).
export const buildCondition = (map, geometryType, getSketchFeature, canPlaceVertex) => (e) => {
  if (!noModifierKeys(e)) { return false }
  const sf = getSketchFeature()
  if (!canPlaceVertex(e.coordinate)) { return false }
  if (!sf || canFinish(geometryType, sf)) { return true }
  const prev = getLastPlacedSketchCoord(sf.getGeometry())
  if (!prev) { return true }
  const pp = map.getPixelFromCoordinate(prev)
  if (!pp) { return true }
  const dx = e.pixel[0] - pp[0]; const dy = e.pixel[1] - pp[1]
  return dx * dx + dy * dy > DUPLICATE_TOLERANCE_PX * DUPLICATE_TOLERANCE_PX
}

// During drawing the sketch has trailing rubber-band (+ closing, for polygons) coords.
const TRAILING_COORDS = { Polygon: 2, LineString: 1 }

// The placed-only GeoJSON of an in-progress sketch (lon/lat), dropping the trailing
// cursor-tracking coords so validation tests just the committed vertices.
const placedFeatureGeoJSON = (store, sketchFeature) => {
  const gj = store.toGeoJSON(sketchFeature)
  const type = gj.geometry.type
  const trailing = TRAILING_COORDS[type]
  const ring = type === 'Polygon' ? gj.geometry.coordinates[0] : gj.geometry.coordinates
  const placed = ring.slice(0, -trailing)
  const geometry = type === 'Polygon'
    ? { type: 'Polygon', coordinates: [placed] }
    : { type: 'LineString', coordinates: placed }
  return { type: 'Feature', geometry, properties: gj.properties }
}

// Gate a would-be placement (mouse click, crosshair tap, Enter) through the shared
// checkPlacement gate (hard rules + user callback). On a veto the vertex never
// appears and a PLACEMENT_BLOCKED event carries the reason.
export const buildCanPlaceVertex = ({ manager, geometryType, getSketch }) => (coordinate) => {
  const sketch = getSketch()
  const result = checkPlacement({
    placed: sketch ? getPlacedSketchCoords(sketch.getGeometry()) : [],
    point: coordinate,
    geometryType,
    onGeometryChange: manager._geometryValidator
  })
  if (!result.valid) {
    manager.emit(ADAPTER_EVENTS.PLACEMENT_BLOCKED, result.blocked)
  }
  return result.valid
}

// Build the displayed-geometry payload (placed vertices + cursor) for the live
// stroke check from the current sketch, plus the placed-vertex count for the
// minimum-vertices threshold.
const displayedSketch = (geometryType, sketch) => {
  const geom = sketch.getGeometry()
  const coords = geom.getCoordinates()
  const ring = geometryType === 'Polygon' ? (coords[0] ?? []) : coords
  const geometry = geometryType === 'Polygon'
    ? { type: 'Polygon', coordinates: [ring] }
    : { type: 'LineString', coordinates: ring }
  return { feature: { type: 'Feature', geometry }, placedCount: getPlacedSketchCoords(geom).length }
}

// Commit a finished sketch to the store under the requested id and emit CREATE.
const finalizeDrawnFeature = (manager, olFeature, featureId, properties) => {
  olFeature.setId(String(featureId))
  olFeature.setProperties(properties)
  manager.store.source.addFeature(olFeature)
  manager.emit(ADAPTER_EVENTS.CREATE, manager.store.toGeoJSON(olFeature))
}

// Wire the OL Draw interaction's lifecycle: track the sketch, react to every sketch
// geometry change (vertex count + live validity), finalise on end, and report a
// cancel on abort.
const attachDrawListeners = (drawInteraction, { manager, featureId, properties, onStart, onSketchChange }) => {
  drawInteraction.on('drawstart', (e) => {
    onStart(e.feature)
    e.feature.getGeometry().on('change', onSketchChange)
  })
  drawInteraction.on('drawend', (e) => finalizeDrawnFeature(manager, e.feature, featureId, properties))
  drawInteraction.on('drawabort', () => { manager.emit(ADAPTER_EVENTS.CANCEL) })
}

// Tracks placed-vertex count and emits VERTEX_CHANGE plus, on each genuine placement,
// a commit-level GEOMETRY_CHANGE ('commit-add') for validation. Deferred a tick so a
// rejection's revert runs after the current click settles.
const createVertexTracker = (manager, getSketch) => {
  let lastPlacedCount = 0
  const emit = (phase, vertexIndex) => {
    setTimeout(() => {
      const sketch = getSketch()
      if (!sketch) { return }
      manager.emit(ADAPTER_EVENTS.GEOMETRY_CHANGE, { feature: placedFeatureGeoJSON(manager.store, sketch), phase, vertexIndex })
    }, 0)
  }
  return {
    resetCount: () => { lastPlacedCount = 0 },
    updateVertexCount: () => {
      const sketch = getSketch()
      if (!sketch) { return }
      const placed = getPlacedSketchCoords(sketch.getGeometry()).length
      manager.emit(ADAPTER_EVENTS.VERTEX_CHANGE, { numVertices: placed })
      if (placed > lastPlacedCount) { emit('commit-add', placed - 1) }
      lastPlacedCount = placed
    },
    // An undo commits a vertex removal, so it must re-validate like any other
    // commit — otherwise the Done gate goes stale.
    emitUndoValidation: () => {
      const sketch = getSketch()
      if (!sketch) { return }
      emit('commit-delete', getPlacedSketchCoords(sketch.getGeometry()).length)
    }
  }
}

// The mode interface consumed by OLDrawManager.
const buildDrawModeApi = ({ map, manager, drawInteraction, input, geometryType, getSketch, updateVertexCount, emitUndoValidation, onStylesChanged, clearSketch, setInvalid, liveStroke, livePlacement }) => ({
  done () {
    if (canFinish(geometryType, getSketch())) { drawInteraction.finishDrawing() }
  },
  cancel () { drawInteraction.abortDrawing() },
  undo () { drawInteraction.removeLastPoint(); updateVertexCount(); emitUndoValidation() },
  setInvalid,
  destroy () {
    liveStroke.destroy()
    livePlacement.destroy()
    manager.off(STYLES_CHANGED_EVENT, onStylesChanged)
    // Emit the final interfaceType so crosshair visibility is correct on exit.
    manager.emit(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: input.getInterfaceType() })
    input.destroy()
    map.removeInteraction(drawInteraction)
    clearSketch()
  }
})

// Build the touch/keyboard draw input for the interaction.
const buildDrawInput = ({ drawInteraction, options, geometryType, getSketch, updateVertexCount, emitUndoValidation, canPlaceVertex }) =>
  createDrawInput({
    drawInteraction,
    options: {
      container: options.container,
      interfaceType: options.interfaceType,
      addVertexButtonId: options.addVertexButtonId,
      mapProvider: options.mapProvider,
      snap: options.snap,
      onUndo: () => { drawInteraction.removeLastPoint(); updateVertexCount(); emitUndoValidation() },
      canFinish: () => canFinish(geometryType, getSketch()),
      canPlace: canPlaceVertex
    }
  })

export const createDrawMode = ({ map, manager, options }) => {
  const { geometryType, featureId, properties = {} } = options

  let sketchFeature = null
  let invalid = false
  let currentSketchStyle = manager.styles.createSketchStyle(geometryType)
  const { updateVertexCount, resetCount, emitUndoValidation } = createVertexTracker(manager, () => sketchFeature)

  const canPlaceVertex = buildCanPlaceVertex({ manager, geometryType, getSketch: () => sketchFeature })

  const drawInteraction = new Draw({
    type: geometryType,
    style: (feature) => currentSketchStyle(feature),
    stopClick: true,
    snapTolerance: TOLERANCES.snapRadius,
    condition: buildCondition(map, geometryType, () => sketchFeature, canPlaceVertex),
    // Block finish gestures (double-click / click-to-close) while the shape is invalid.
    finishCondition: () => manager._geometryValid !== false
  })
  map.addInteraction(drawInteraction)

  const setSketchInvalid = (next) => {
    invalid = next
    currentSketchStyle = manager.styles.createSketchStyle(geometryType, invalid)
    drawInteraction.overlay_.changed()
  }
  // Drives the live invalid stroke from every sketch change (mouse / touch / keyboard
  // rubber-banding): default rules synchronously, user callback throttled. The same
  // displayed geometry (placed vertices + crosshair candidate) feeds the Add-point
  // placement gate, evaluated with the placement (hard) rules so the button tracks
  // exactly what a tap would do.
  const liveStroke = createLiveStroke({ onChange: setSketchInvalid })
  const livePlacement = createLiveStroke({
    validate: validatePlacement,
    onChange: (vetoed, reason) => manager.emit(ADAPTER_EVENTS.CAN_PLACE_CHANGE, { canPlace: !vetoed, reason })
  })
  const liveMode = MODE_BY_GEOMETRY[geometryType]
  const updateLiveValidity = () => {
    if (!sketchFeature) { return }
    const { feature, placedCount } = displayedSketch(geometryType, sketchFeature)
    liveStroke.update({ feature, context: { mode: liveMode }, placedCount, onGeometryChange: manager._geometryValidator })
    livePlacement.update({ feature, context: { mode: liveMode, vertexIndex: placedCount }, onGeometryChange: manager._geometryValidator })
  }

  // Update sketch style when map style changes
  const onStylesChanged = () => {
    currentSketchStyle = manager.styles.createSketchStyle(geometryType, invalid)
    drawInteraction.overlay_.changed()
  }
  manager.on(STYLES_CHANGED_EVENT, onStylesChanged)
  // OL internal: overlay_ is the private VectorLayer used for the sketch geometry.
  // updateWhileAnimating_ forces per-frame redraws during view animations (keyboard pan).
  // Without this, geom.setCoordinates() calls are ignored while the ANIMATING hint is set.
  // Check ol/interaction/Draw.js and ol/layer/BaseVector.js if this breaks after an OL upgrade.
  drawInteraction.overlay_.updateWhileAnimating_ = true

  attachDrawListeners(drawInteraction, {
    manager,
    featureId,
    properties,
    onStart: (f) => { sketchFeature = f; resetCount() },
    onSketchChange: () => { updateVertexCount(); updateLiveValidity() }
  })

  const input = buildDrawInput({
    drawInteraction,
    options,
    geometryType,
    getSketch: () => sketchFeature,
    updateVertexCount,
    emitUndoValidation,
    canPlaceVertex
  })

  return buildDrawModeApi({
    map,
    manager,
    drawInteraction,
    input,
    geometryType,
    getSketch: () => sketchFeature,
    updateVertexCount,
    emitUndoValidation,
    onStylesChanged,
    clearSketch: () => { sketchFeature = null },
    // External writes go through the controller so its cache mirrors the style.
    setInvalid: (next) => liveStroke.set(next),
    liveStroke,
    livePlacement
  })
}
