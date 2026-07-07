/**
 * Button and map-event wiring for the draw plugin.
 *
 * Uses the normalised adapter interface (draw.on/off, draw.done(), draw.cancel(),
 * draw.setSnapEnabled(), etc.) so this file is map-framework-agnostic.
 * All MapLibre / OL specifics live in the adapter.
 */
import { ADAPTER_EVENTS } from './adapterEvents.js'
import { validateGeometry } from './validation/validateGeometry.js'
import { MAP_SIZE_SCALES } from './defaults.js'

const EDIT_VERTEX_MODE = 'edit_vertex'
const GEOMETRY_INVALID_EVENT = 'draw:geometryinvalid'

// Re-open a feature in vertex-edit mode (used when a drawn shape finishes invalid).
// Mirrors the options built by api/editFeature.js. Edit-mode Done is gated by the
// same validity, so the shape can't be finished until it's fixed.
const enterEditVertexMode = ({ draw, appState, appConfig, mapState, dispatch }, featureId) => {
  draw.changeMode(EDIT_VERTEX_MODE, {
    container: appState?.layoutRefs?.viewportRef?.current,
    deleteVertexButtonId: `${appConfig?.id}-draw-delete-point`,
    undoButtonId: `${appConfig?.id}-draw-undo`,
    isPanEnabled: appState?.interfaceType !== 'keyboard',
    interfaceType: appState?.interfaceType,
    scale: MAP_SIZE_SCALES[mapState?.mapSize],
    featureId,
    getSnapEnabled: () => draw.isSnapEnabled()
  })
  const editing = draw.get(featureId)
  dispatch({ type: 'SET_FEATURE', payload: { feature: editing, tempFeature: editing } })
  dispatch({ type: 'SET_MODE', payload: EDIT_VERTEX_MODE })
  dispatch({ type: 'SET_GEOMETRY_VALID', payload: false })
  draw.setGeometryValid?.(false)
  draw.setInvalid?.(true)
}

function createHandlers ({ appState, appConfig, mapState, pluginState, mapProvider, eventBus, resetState }) {
  const { draw } = mapProvider
  const { feature, tempFeature } = pluginState
  const { dispatch } = pluginState
  // A shape that finished invalid and was re-opened in edit mode: its eventual
  // edit-finish must report as a creation, not an edit.
  let pendingCreateId = null

  return {
    handleDone: () => { draw.done() },
    handleCancel: () => {
      const mode = draw.getMode()
      if (mode === EDIT_VERTEX_MODE && tempFeature?.id) { draw.add(feature) }
      pendingCreateId = null
      draw.cancel(); resetState()
      eventBus.emit('draw:cancelled', feature)
    },
    handleUndo: () => draw.undo(),
    handleDeleteVertex: () => draw.deleteVertex(),
    handleSnap: () => {
      pluginState.dispatch({ type: 'TOGGLE_SNAP' })
      draw.setSnapEnabled(!pluginState.snap)
    },
    onCreate: (f) => {
      // A shape can be finished by the Done button OR a map gesture (double-click,
      // clicking the first vertex, Enter). Only the button is gated, so re-validate
      // here to catch the gesture paths — an invalid shape must never be finalised.
      const { valid } = validateGeometry(f, { kind: 'create', mode: draw.getMode() }, { onGeometryChange: draw._geometryValidator })
      if (!valid) {
        pendingCreateId = f.id
        eventBus.emit(GEOMETRY_INVALID_EVENT, { feature: f, kind: 'create', mode: EDIT_VERTEX_MODE })
        setTimeout(() => enterEditVertexMode({ draw, appState, appConfig, mapState, dispatch }, f.id), 0)
        return
      }
      resetState(); setTimeout(() => draw.changeMode('disabled'), 0); eventBus.emit('draw:created', f)
    },
    onEditFinish: (f) => {
      resetState()
      setTimeout(() => draw.changeMode('disabled'), 0)
      // A shape that was drawn-then-fixed reports as a creation, not an edit.
      if (pendingCreateId && f.id === pendingCreateId) {
        pendingCreateId = null
        eventBus.emit('draw:created', f)
      } else {
        eventBus.emit('draw:edited', f)
      }
    },
    onCancel: () => {},
    onVertexSelection: (e) => { pluginState.dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e }); eventBus.emit('draw:vertexselection', e) },
    onVertexChange: (e) => { pluginState.dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertices: e.numVertices } }) },
    onUndoChange: (l) => { pluginState.dispatch({ type: 'SET_UNDO_STACK_LENGTH', payload: l }) },
    onUpdate: (f) => { eventBus.emit('draw:updated', f) },
    onGeometryChange: (e) => {
      // Only commit-level changes (add/move/insert/delete) carry a `kind`.
      // Preview events (e.g. split's live preview) have none and are ignored.
      if (!e?.kind) { return }

      const mode = draw.getMode()
      const context = { kind: e.kind, vertexIndex: e.vertexIndex, mode }
      const { valid, reason } = validateGeometry(e.feature, context, { onGeometryChange: draw._geometryValidator })

      // Rules only gate the Done button — never revert. A shape can pass through
      // interim invalid states while being built or reshaped.
      pluginState.dispatch({ type: 'SET_GEOMETRY_VALID', payload: valid })
      draw.setGeometryValid?.(valid)
      // The invalid stroke is committed-validity-driven in edit mode only; in draw
      // mode the adapters drive it live from the displayed geometry (placed
      // vertices + cursor) on every rubber-band move.
      if (mode === EDIT_VERTEX_MODE) {
        draw.setInvalid?.(!valid)
      }
      if (!valid) {
        eventBus.emit(GEOMETRY_INVALID_EVENT, { reason, ...context, feature: e.feature })
      }
    },
    // A vertex placement was rejected (hard rule or user callback veto). Surface it
    // on the public bus with kind 'place' so a future tooltip can show the reason.
    onPlacementBlocked: (e) => {
      eventBus.emit(GEOMETRY_INVALID_EVENT, e)
    },
    // Live (mid-drag) validity flip while editing — the displayed shape is exactly
    // what Done finishes there, so it gates the Done button in real time. Emitted
    // by the adapters' edit wiring only, on flips only.
    onValidityChange: (e) => {
      pluginState.dispatch({ type: 'SET_GEOMETRY_VALID', payload: e.valid })
      draw.setGeometryValid?.(e.valid)
    },
    // Live placement-veto flip while drawing — gates the Add point button so it
    // never looks active when a tap would be rejected.
    onCanPlaceChange: (e) => {
      pluginState.dispatch({ type: 'SET_CAN_ADD_POINT', payload: e.canPlace })
    },
    // The mode's interface type changed (device switch mid-draw, or the final
    // value on mode exit) — relay so the app can sync appState.interfaceType.
    onInterfaceTypeChange: (e) => {
      eventBus.emit('draw:interfacetypechange', { interfaceType: e.interfaceType })
    }
  }
}

function attachButtonHandlers (buttonConfig, handlers) {
  const { drawDone, drawCancel, drawUndo, drawDeletePoint, drawSnap } = buttonConfig
  drawDone.onClick = handlers.handleDone
  drawCancel.onClick = handlers.handleCancel
  drawUndo.onClick = handlers.handleUndo
  if (drawDeletePoint) { drawDeletePoint.onClick = handlers.handleDeleteVertex }
  if (drawSnap) { drawSnap.onClick = handlers.handleSnap }
}

function attachDrawEvents (draw, handlers) {
  draw.on(ADAPTER_EVENTS.CREATE, handlers.onCreate)
  draw.on(ADAPTER_EVENTS.EDIT_FINISH, handlers.onEditFinish)
  draw.on(ADAPTER_EVENTS.CANCEL, handlers.onCancel)
  draw.on(ADAPTER_EVENTS.VERTEX_SELECTION, handlers.onVertexSelection)
  draw.on(ADAPTER_EVENTS.VERTEX_CHANGE, handlers.onVertexChange)
  draw.on(ADAPTER_EVENTS.UNDO_CHANGE, handlers.onUndoChange)
  draw.on(ADAPTER_EVENTS.UPDATE, handlers.onUpdate)
  draw.on(ADAPTER_EVENTS.GEOMETRY_CHANGE, handlers.onGeometryChange)
  draw.on(ADAPTER_EVENTS.PLACEMENT_BLOCKED, handlers.onPlacementBlocked)
  draw.on(ADAPTER_EVENTS.VALIDITY_CHANGE, handlers.onValidityChange)
  draw.on(ADAPTER_EVENTS.CAN_PLACE_CHANGE, handlers.onCanPlaceChange)
  draw.on(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, handlers.onInterfaceTypeChange)
}

function detachButtonHandlers (buttonConfig) {
  const { drawDone, drawCancel, drawUndo, drawDeletePoint, drawSnap } = buttonConfig
  drawDone.onClick = null
  drawCancel.onClick = null
  drawUndo.onClick = null
  if (drawDeletePoint) { drawDeletePoint.onClick = null }
  if (drawSnap) { drawSnap.onClick = null }
}

function detachDrawEvents (draw, handlers) {
  draw.off(ADAPTER_EVENTS.CREATE, handlers.onCreate)
  draw.off(ADAPTER_EVENTS.EDIT_FINISH, handlers.onEditFinish)
  draw.off(ADAPTER_EVENTS.CANCEL, handlers.onCancel)
  draw.off(ADAPTER_EVENTS.VERTEX_SELECTION, handlers.onVertexSelection)
  draw.off(ADAPTER_EVENTS.VERTEX_CHANGE, handlers.onVertexChange)
  draw.off(ADAPTER_EVENTS.UNDO_CHANGE, handlers.onUndoChange)
  draw.off(ADAPTER_EVENTS.UPDATE, handlers.onUpdate)
  draw.off(ADAPTER_EVENTS.GEOMETRY_CHANGE, handlers.onGeometryChange)
  draw.off(ADAPTER_EVENTS.PLACEMENT_BLOCKED, handlers.onPlacementBlocked)
  draw.off(ADAPTER_EVENTS.VALIDITY_CHANGE, handlers.onValidityChange)
  draw.off(ADAPTER_EVENTS.CAN_PLACE_CHANGE, handlers.onCanPlaceChange)
  draw.off(ADAPTER_EVENTS.INTERFACE_TYPE_CHANGE, handlers.onInterfaceTypeChange)
}

export function attachEvents ({ appState, appConfig, mapState, pluginState, mapProvider, buttonConfig, eventBus }) {
  const { draw } = mapProvider
  const resetState = () => {
    pluginState.dispatch({ type: 'SET_MODE', payload: null })
    pluginState.dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
  }
  const handlers = createHandlers({ appState, appConfig, mapState, pluginState, mapProvider, eventBus, resetState })
  attachButtonHandlers(buttonConfig, handlers)
  attachDrawEvents(draw, handlers)
  return () => { detachButtonHandlers(buttonConfig); detachDrawEvents(draw, handlers) }
}
