import Draw from 'ol/interaction/Draw.js'
import { noModifierKeys } from 'ol/events/condition.js'
import { wireInputEvents, applyCrossHairVisibility } from '../draw/drawInput.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { validatePlacement } from '../../../validation/validateGeometry.js'
import { TOLERANCES } from '../defaults.js'

const MODE = 'draw_point'

// A point has no ring/rubber-band to build a candidate from — just the coordinate about to
// be placed. Mirrors validateGeometry.js's attemptPlacement, but that helper hardcodes
// Polygon/LineString via MODE_BY_GEOMETRY, so a Point candidate is built and validated
// directly (same approach as the MapLibre adapter's drawPointMode.js).
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

// Commit a finished point to the store under the requested id and emit CREATE — mirrors
// draw/DrawMode.js's finalizeDrawnFeature (identical shape, kept separate rather than
// imported since draw/DrawMode.js isn't otherwise a shared dependency of this mode).
// Symbol resolution runs after the feature is in the store (not before), matching the
// MapLibre adapter's own ordering. The resolver itself is injected by OLDrawManager via
// changeMode's options (mirrors the ML adapter's state.resolvePointSymbol convention — see
// MaplibreDrawAdapter.js's changeMode) so this mode has no direct dependency on
// symbolRegistry/mapProvider/pointSymbolImages.js.
const finalizeDrawnFeature = (manager, resolvePointSymbol, olFeature, featureId, properties) => {
  olFeature.setId(String(featureId))
  olFeature.setProperties(properties)
  manager.store.source.addFeature(olFeature)
  manager.emit(ADAPTER_EVENTS.CREATE, manager.store.toGeoJSON(olFeature))
  resolvePointSymbol?.(olFeature)
}

/**
 * Touch/keyboard/"Add point" input for draw_point — the same concerns as
 * draw/drawInput.js (crosshair, interface-type tracking, add-vertex-button/Enter), reused
 * directly, but with a much smaller placement step: a point has no rubber band to update
 * while positioning (the crosshair itself already shows where it'll land) and nothing to
 * undo before a single-click commit, so those callbacks are no-ops here.
 */
const buildPointInput = ({ drawInteraction, options, canPlace }) => {
  const { container, addVertexButtonId, mapProvider, snap, crossHair } = options
  let interfaceType = options.interfaceType ?? 'mouse'
  const getInterfaceType = () => interfaceType

  // appendCoordinates() only builds up LineString/Polygon rings — for a Point-type Draw
  // interaction it does nothing beyond starting the sketch (confirmed by reading OL's own
  // source), so finishDrawing() has to be called explicitly right after to actually commit.
  const placePoint = () => {
    const raw = mapProvider.getCenter()
    const coord = (getInterfaceType() !== 'mouse' && snap) ? snap.apply(raw) : raw
    snap?.hideIndicator()
    if (!canPlace(coord)) { return }
    drawInteraction.appendCoordinates([coord])
    drawInteraction.finishDrawing()
  }

  // Keeps the snap indicator visible at the crosshair while positioning via touch/keyboard
  // (mouse hover is handled by the separate OL snap interaction already attached by
  // OLDrawManager) — the closest point-shaped equivalent of updateRubberbanding.
  const updateSnapIndicator = () => {
    if (getInterfaceType() !== 'mouse' && snap) { snap.apply(mapProvider.getCenter()) }
  }

  // Mirrors draw/drawInput.js's createDrawInput: an interface-type switch to touch/keyboard
  // must refresh the snap indicator immediately at the crosshair, not wait for the next
  // pointermove/change:center — otherwise it stays hidden until the user first pans or drags
  // after entering the mode (the same gap the MapLibre adapter's onInterfaceTypeChange already
  // guards against by calling onMove(state) right after _setInterface).
  const applyInterfaceType = (type) => {
    interfaceType = type
    applyCrossHairVisibility(crossHair, type)
    updateSnapIndicator()
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

  return {
    getInterfaceType,
    setInterfaceType: applyInterfaceType,
    destroy () { events.destroy() }
  }
}

/**
 * Draw mode for placing a single point: mouse click, or crosshair + Enter/"Add point"
 * button for touch/keyboard. Commits immediately on the first placement — unlike
 * draw_line/draw_polygon, there is no rubber band, no multi-vertex undo, and no "Done"
 * step (mirrors the MapLibre adapter's drawPointMode.js decision).
 *
 * OL's own Draw({type:'Point'}) interaction already finishes a real mouse click
 * immediately (confirmed by reading its handleUpEvent — mode 'Point' always attempts
 * finishDrawing() on pointer-up, no second click needed), so the mouse path needs no
 * extra wiring beyond the placement-veto condition every mode already has. Deliberately
 * NOT built via draw/DrawMode.js's createDrawMode()/createVertexPlacement() — those are
 * parametrised around a ring of placed vertices + a trailing rubber-band coordinate,
 * which a single-click commit doesn't have (mirrors the same decision already made for
 * the MapLibre adapter, and the OL EditMode/DrawMode split noted in
 * feedback_adapter_parity.md: don't force point through machinery shaped for lines/polygons
 * just because they happen to share a file).
 */
export const createDrawPointMode = ({ map, manager, options }) => {
  const { featureId, properties = {} } = options
  const canPlace = canPlaceVertex(manager)

  const drawInteraction = new Draw({
    type: 'Point',
    // Without an explicit style, OL renders its own default sketch style (a blue circle)
    // following the cursor before commit — core/styles.js's createSketchStyle() already
    // suppresses this same default for the "ghost" Point sketch OL renders alongside a
    // Polygon/LineString sketch (see its own comment); a real Point sketch needs the same
    // treatment, since it commits on the very first click with nothing meaningful to preview.
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
