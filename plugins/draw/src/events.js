/**
 * Button and map-event wiring for the draw plugin.
 *
 * Uses the normalised adapter interface (draw.on/off, draw.done(), draw.cancel(),
 * draw.setSnapEnabled(), etc.) so this file is map-framework-agnostic.
 * All MapLibre / OL specifics live in the adapter.
 */
import { ADAPTER_EVENTS } from './adapterEvents.js'
import { getCommitChecks, isSameGeometry } from './validation/commitChecks.js'
import { MIN_VERTICES_REASONS } from './validation/rules.js'
import { stripInternalProperties } from './utils/stripInternalProperties.js'
import { isEditMode, isCheckedMode } from './utils/drawModes.js'

const EDIT_VERTEX_MODE = 'edit_vertex'
const GEOMETRY_INVALID_EVENT = 'draw:geometryinvalid'

// A shape that finished without a passing check is reopened in edit mode, and its
// eventual edit-finish must report as a creation. Kept per draw adapter, not in
// createHandlers, which is rebuilt on every plugin state change.
const pendingCreateIds = new WeakMap()

// A shape that simply hasn't reached its minimum vertex count yet isn't a mistake —
// it's the normal, expected state of "still being drawn" — so it's excluded below
// even though it's a genuine COMMIT_RULES failure like any other.
const isIncompleteShape = (reason) => Object.values(MIN_VERTICES_REASONS).includes(reason)

// A discrete, one-shot invalid result (a rejected placement, a finished-but-invalid
// shape, or a completed commit that failed validation — never a continuous live-drag
// flip, which goes via onValidityChange/CAN_PLACE_CHANGE instead) gets a hint toast
// alongside the existing public event, so the reason is visible without every
// consumer having to wire up their own listener for it. The public event still
// fires either way — only the hint is skipped for an incomplete shape.
// A result with its own `announcement` is presented by the consumer, so it gets no hint.
const createGeometryInvalidEmitter = (eventBus, hints) => ({ announcement, ...payload }) => {
  eventBus.emit(GEOMETRY_INVALID_EVENT, payload)
  if (!announcement && payload.reason && !isIncompleteShape(payload.reason)) { hints.show(payload.reason) }
}

// Claims MapControls' D-pad for the currently selected vertex — see the generic
// mapProvider.activeMoveTarget contract (MapControls.jsx). Any plugin could use
// this slot; the draw plugin is just its first consumer.
const buildVertexMoveTarget = (draw) => ({
  move: (dx, dy, isLargeStep) => draw.nudgeSelectedVertex(dx, dy, isLargeStep),
  label: 'vertex'
})

// Vertex-selection handlers: sync pluginState.selectedVertexIndex, and claim/release
// MapControls' D-pad via buildVertexMoveTarget above.
const createVertexSelectionHandlers = ({ draw, pluginState, mapProvider, eventBus }) => ({
  onVertexSelection: (e) => {
    pluginState.dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e })
    mapProvider.activeMoveTarget = e.index >= 0 ? buildVertexMoveTarget(draw) : null
    eventBus.emit('draw:vertexselection', e)
  },
  onVertexChange: (e) => {
    pluginState.dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertices: e.numVertices } })
    mapProvider.activeMoveTarget = null
  }
})

// Re-open a feature in edit mode (used when a drawn shape finishes without a passing
// check — invalid, still pending, or errored). Mirrors the options built by
// api/editFeature.js. Edit-mode Done is gated by the same check, so the shape can't be
// finished until it passes. A pending check carries on and settles in edit mode.
const enterEditMode = ({ draw, appState, appConfig, mapState, dispatch }, featureId, geometryType) => {
  const mode = geometryType === 'Point' ? 'edit_point' : EDIT_VERTEX_MODE
  draw.changeMode(mode, {
    container: appState?.layoutRefs?.viewportRef?.current,
    deleteVertexButtonId: `${appConfig?.id}-draw-delete-point`,
    undoButtonId: `${appConfig?.id}-draw-undo`,
    isPanEnabled: appState?.interfaceType !== 'keyboard',
    interfaceType: appState?.interfaceType,
    scale: mapState?.mapSizeScale,
    featureId,
    getSnapEnabled: () => draw.isSnapEnabled()
  })
  const editing = draw.get(featureId)
  const { status } = getCommitChecks(draw).state
  dispatch({ type: 'SET_FEATURE', payload: { feature: editing, tempFeature: editing } })
  dispatch({ type: 'SET_MODE', payload: mode })
  dispatch({ type: 'SET_VALIDATION_STATUS', payload: status })
  draw.setGeometryValid?.(status === 'valid')
  draw.setInvalid?.(status === 'invalid')
}

// Screen reader messages for a slow check (see SLOW_CHECK_MS). A check that settles quickly
// says nothing new — Done enabling, or the hint for a failure, is enough. A result's own
// `announcement` replaces these, however quickly it settles.
const CHECK_MESSAGES = {
  pending: 'Checking shape',
  valid: 'Shape check passed',
  invalid: 'Shape check failed',
  error: 'Shape could not be checked'
}

// Announced as an 'action' so a run of quick changes collapses to the latest message,
// and so the failure hint's own ambient announcement yields rather than repeating it.
const announceCheck = (announce, { status, result, slow, afterPending }) => {
  if (result?.announcement) {
    announce?.(result.announcement, 'action')
  } else if (status === 'pending') {
    if (slow) { announce?.(CHECK_MESSAGES.pending, 'action') }
  } else if (afterPending) {
    announce?.((status === 'invalid' && result.reason) || CHECK_MESSAGES[status], 'action')
  } else {
    // Settled straight away
  }
}

// Applies each settled commit-level check (validation/commitChecks.js). Only the
// latest revision ever reaches here, so a stale reply can't change the Done gate.
const createCheckStateHandler = ({ draw, dispatch, emitGeometryInvalid, announce }) => (state) => {
  const { status, result, context, feature } = state
  const valid = status === 'valid'
  // A slow check is the same pending check, now shown as "Checking…"
  dispatch(state.slow ? { type: 'SET_CHECK_SLOW' } : { type: 'SET_VALIDATION_STATUS', payload: status })
  announceCheck(announce, state)
  // Also blocks the adapters' finish gestures (double-click, clicking the first vertex)
  // while the check is pending or failing.
  draw.setGeometryValid?.(valid)
  if (status === 'pending' || status === 'error') { return }
  // The invalid stroke is committed-validity-driven in edit mode only; in draw mode the
  // adapters drive it live from the displayed geometry (placed vertices + cursor).
  if (isEditMode(draw.getMode())) {
    draw.setInvalid?.(!valid)
  }
  // edit-start is the baseline check on opening a feature, not a change the user made
  if (!valid && context?.phase !== 'edit-start') {
    const { reason, source, announcement } = result
    emitGeometryInvalid({ reason, source, announcement, ...context, feature: stripInternalProperties(feature) })
  }
}

function createHandlers ({ appState, appConfig, mapState, pluginState, mapProvider, eventBus, emitGeometryInvalid, announce, resetState }) {
  const { draw } = mapProvider
  const { feature, tempFeature } = pluginState
  const { dispatch } = pluginState
  const checks = getCommitChecks(draw)

  return {
    handleDone: () => { draw.done() },
    handleCancel: () => {
      const mode = draw.getMode()
      if (isEditMode(mode) && tempFeature?.id) { draw.add(feature) }
      pendingCreateIds.delete(draw)
      draw.cancel(); resetState()
      eventBus.emit('draw:cancelled', stripInternalProperties(feature))
    },
    handleUndo: () => draw.undo(),
    handleDeleteVertex: () => draw.deleteVertex(),
    handleSnap: () => {
      pluginState.dispatch({ type: 'TOGGLE_SNAP' })
      draw.setSnapEnabled(!pluginState.snap)
    },
    onCreate: (f) => {
      // A shape can be finished by the Done button OR a map gesture (double-click,
      // clicking the first vertex, Enter), so the latest check is re-applied here — a
      // shape without a passing check must never be finalised. A passing or still-pending
      // result for this same geometry is reused, so finishing doesn't repeat a server
      // call; otherwise (a point, which has no commits before it's created, or a failed
      // result) the shape is checked now with phase 'create'.
      const { status, feature: checkedFeature } = checks.state
      const isReusable = (status === 'valid' || status === 'pending') && isSameGeometry(checkedFeature, f)
      if (!isReusable) {
        checks.run({ feature: f, context: { phase: 'create', mode: draw.getMode() }, onGeometryChange: draw._commitValidator })
      }
      if (checks.state.status !== 'valid') {
        pendingCreateIds.set(draw, f.id)
        setTimeout(() => enterEditMode({ draw, appState, appConfig, mapState, dispatch }, f.id, f.geometry?.type), 0)
        return
      }
      resetState(); setTimeout(() => draw.changeMode('disabled'), 0); eventBus.emit('draw:created', stripInternalProperties(f))
    },
    onEditFinish: (f) => {
      resetState()
      setTimeout(() => draw.changeMode('disabled'), 0)
      // A shape that was drawn-then-fixed reports as a creation, not an edit.
      if (pendingCreateIds.get(draw) === f.id) {
        pendingCreateIds.delete(draw)
        eventBus.emit('draw:created', stripInternalProperties(f))
      } else {
        eventBus.emit('draw:edited', stripInternalProperties(f))
      }
    },
    onCancel: () => { checks.reset() },
    ...createVertexSelectionHandlers({ draw, pluginState, mapProvider, eventBus }),
    onUndoChange: (l) => { pluginState.dispatch({ type: 'SET_UNDO_STACK_LENGTH', payload: l }) },
    onUpdate: (f) => { eventBus.emit('draw:updated', stripInternalProperties(f)) },
    onGeometryChange: (e) => {
      // Only commit-level changes carry a `phase` ('change').
      // Preview events (e.g. split's live preview) have none and are ignored.
      if (!e?.phase) { return }

      // A commit that lands after the session has ended (the adapters defer them a tick)
      // is dropped rather than calling onGeometryChange.
      const mode = draw.getMode()
      if (!isCheckedMode(mode)) { return }

      // Rules only gate the Done button — never revert. A shape can pass through
      // interim invalid states while being built or reshaped. The result is applied
      // by the check-state handler once it settles.
      checks.run({
        feature: e.feature,
        context: { phase: e.phase, vertexIndex: e.vertexIndex, mode },
        onGeometryChange: draw._commitValidator
      })
    },
    // A vertex placement was rejected (placement rule or user callback veto). Surface it
    // on the public bus with phase 'place', and as a hint toast, so the reason is visible.
    onPlacementBlocked: (e) => {
      if (e.announcement) { announce?.(e.announcement, 'action') }
      emitGeometryInvalid({ ...e, feature: stripInternalProperties(e.feature) })
    },
    // Live (mid-drag) validity flip while editing — the displayed shape is exactly
    // what Done finishes there, so it gates the Done button in real time alongside
    // the commit-level check. Emitted by the adapters' edit wiring only, on flips only.
    onValidityChange: (e) => {
      pluginState.dispatch({ type: 'SET_PREVIEW_VALID', payload: e.valid })
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

export function attachEvents ({ appState, appConfig, mapState, pluginState, mapProvider, buttonConfig, eventBus, hints, announce }) {
  const { draw } = mapProvider
  const resetState = () => {
    pluginState.dispatch({ type: 'SET_MODE', payload: null })
    pluginState.dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
    // Release MapControls' D-pad back to panning the map whenever a draw/edit
    // session ends — a stale claim here would silently hijack it for good.
    mapProvider.activeMoveTarget = null
    // Ends the check session too, so a reply still in flight is dropped.
    getCommitChecks(draw).reset()
  }
  const emitGeometryInvalid = createGeometryInvalidEmitter(eventBus, hints)
  const handlers = createHandlers({ appState, appConfig, mapState, pluginState, mapProvider, eventBus, emitGeometryInvalid, announce, resetState })
  const checks = getCommitChecks(draw)
  checks.setSink(createCheckStateHandler({ draw, dispatch: pluginState.dispatch, emitGeometryInvalid, announce }))
  attachButtonHandlers(buttonConfig, handlers)
  attachDrawEvents(draw, handlers)
  return () => { checks.setSink(null); detachButtonHandlers(buttonConfig); detachDrawEvents(draw, handlers) }
}
