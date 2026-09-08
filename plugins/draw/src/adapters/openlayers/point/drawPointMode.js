import Draw from 'ol/interaction/Draw.js'
import { noModifierKeys } from 'ol/events/condition.js'
import { wireInputEvents, applyCrossHairVisibility } from '../draw/drawInput.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { validatePlacement } from '../../../validation/validateGeometry.js'
import { TOLERANCES } from '../defaults.js'

const MODE = 'draw_point'

// A point has no ring/rubber-band to build a candidate from, so it's built and validated
// directly rather than via validateGeometry.js's Polygon/LineString-only attemptPlacement.
const canPlaceVertex = (manager) => (coordinate) => {
  const candidate = { type: 'Feature', geometry: { type: 'Point', coordinates: coordinate }, properties: {} }
  const { valid, reason } = validatePlacement(
    candidate,
    { mode: MODE, vertexIndex: 0 },
    { onGeometryChange: manager._geometryValidator }
  )
  if (!valid) {
    manager.emit(ADAPTER_EVENTS.PLACEMENT_BLOCKED, { feature: candidate, reason: reason ?? null, phase: 'place', mode: MODE, vertexIndex: 0 })
  }
  return valid
}

// Commit a finished point to the store under the requested id and emit CREATE. Symbol
// resolution runs after the feature is in the store, and the resolver itself is injected by
// OLDrawManager (mirrors the MapLibre adapter's own ordering and resolvePointSymbol convention).
const finalizeDrawnFeature = (manager, resolvePointSymbol, olFeature, featureId, properties) => {
  olFeature.setId(String(featureId))
  olFeature.setProperties(properties)
  manager.store.source.addFeature(olFeature)
  manager.emit(ADAPTER_EVENTS.CREATE, manager.store.toGeoJSON(olFeature))
  resolvePointSymbol?.(olFeature)
}

/**
 * Touch/keyboard/"Add point" input for draw_point — reuses draw/drawInput.js's crosshair and
 * interface-type wiring, but with no rubber band or undo since a point commits on one click.
 */
const buildPointInput = ({ drawInteraction, options, canPlace }) => {
  const { container, addVertexButtonId, mapProvider, snap, crossHair } = options
  let interfaceType = options.interfaceType ?? 'mouse'
  const getInterfaceType = () => interfaceType

  // appendCoordinates() only starts the sketch for a Point-type Draw interaction, so
  // finishDrawing() must be called explicitly to commit. Only ever reached via the crosshair
  // path (Enter, the add-vertex button, or the crosshair's own click), never a real mouse
  // click, so snap always applies here when available.
  const placePoint = () => {
    const raw = mapProvider.getCenter()
    const coord = snap ? snap.apply(raw) : raw
    snap?.hideIndicator()
    if (!canPlace(coord)) { return }
    drawInteraction.appendCoordinates([coord])
    drawInteraction.finishDrawing()
  }

  // Keeps the snap indicator visible at the crosshair — the point-shaped equivalent of
  // updateRubberbanding. Callers decide when this is worth calling (see applyInterfaceType
  // below and draw/drawInput.js's onCenterChange).
  const updateSnapIndicator = () => {
    if (snap) { snap.apply(mapProvider.getCenter()) }
  }

  // Mirrors draw/drawInput.js's createDrawInput: a switch to touch/keyboard refreshes the
  // snap indicator immediately rather than waiting for the next pan. Switching back to mouse
  // has no crosshair target to refresh.
  const applyInterfaceType = (type) => {
    interfaceType = type
    applyCrossHairVisibility(crossHair, type)
    if (type !== 'mouse') { updateSnapIndicator() }
  }

  const events = wireInputEvents({
    container,
    addVertexButtonId,
    olView: drawInteraction.getMap()?.getView(),
    onUndo: null,
    getInterfaceType,
    setInterfaceType: applyInterfaceType,
    clearLastCoord: () => {},
    updateRubberbanding: updateSnapIndicator,
    placeVertex: placePoint
  })

  applyCrossHairVisibility(crossHair, interfaceType)

  // Shared "commit here" entry point for the crosshair button's own onClick — same action as
  // Enter/the touch add-vertex button.
  if (crossHair) {
    crossHair.activate = placePoint
  }

  return {
    getInterfaceType,
    setInterfaceType: applyInterfaceType,
    destroy () {
      if (crossHair?.activate === placePoint) { crossHair.activate = null }
      events.destroy()
    }
  }
}

/**
 * Draw mode for placing a single point: mouse click, or crosshair + Enter/"Add point" button
 * for touch/keyboard. Commits immediately, with no rubber band, undo, or "Done" step. OL's own
 * Draw({type:'Point'}) interaction already finishes a real mouse click on pointer-up, so the
 * mouse path needs no extra wiring. Deliberately not built via draw/DrawMode.js's
 * createDrawMode()/createVertexPlacement() — those assume a ring of vertices plus a trailing
 * rubber-band coordinate, which a single-click commit doesn't have.
 */
export const createDrawPointMode = ({ map, manager, options }) => {
  const { featureId, properties = {} } = options
  const canPlace = canPlaceVertex(manager)

  const drawInteraction = new Draw({
    type: 'Point',
    // Suppresses OL's default sketch style (a blue circle following the cursor) — nothing
    // meaningful to preview since this commits on the first click.
    style: () => [],
    snapTolerance: TOLERANCES.snapRadius,
    condition: (e) => noModifierKeys(e) && canPlace(e.coordinate)
  })
  map.addInteraction(drawInteraction)

  drawInteraction.on('drawend', (e) => finalizeDrawnFeature(manager, options.resolvePointSymbol, e.feature, featureId, properties))
  drawInteraction.on('drawabort', () => { manager.emit(ADAPTER_EVENTS.CANCEL) })

  const input = buildPointInput({ drawInteraction, options, canPlace })

  return {
    done () {}, // no-op: commit is immediate, there's no pending sketch to finish
    cancel () { drawInteraction.abortDrawing() },
    undo () {}, // no-op: nothing placed yet to undo before commit
    setInterfaceType (type) { input.setInterfaceType(type) },
    destroy () {
      manager.emit(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, { interfaceType: input.getInterfaceType() })
      input.destroy()
      map.removeInteraction(drawInteraction)
    }
  }
}
