import { createPointSelectionState } from './pointSelectionState.js'
import { deriveModifyOp } from '../edit/modifyInteraction.js'
import { createPointDragInteraction } from './pointDragInteraction.js'
import { PIXEL_TOLERANCE } from '../edit/vertexHitTest.js'
import { createTouchHandler } from '../edit/touchHandler.js'
import { createKeyboardHandler } from '../edit/keyboardHandler.js'
import { movePoint, applyPointUndo } from './pointOps.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'
import { createLiveStroke } from '../../../validation/liveStroke.js'

const TOUCH_INTERFACE = 'touch'
// Shared phase name with edit_vertex's own move_vertex op — a moved point re-validates the
// same way (validation/rules.js has no Point-specific rule, so this only ever gates a
// consumer's own onGeometryChange callback).
const MOVE_VERTEX = 'commit-move'

// A symbol icon renders far bigger than buildModifyCondition's fixed-radius hit-test (tuned
// for a plain vertex dot), so this hit-tests the icon's own rendered pixels instead. No touch
// check — pointDragInteraction.js's handleDownEvent already gates on that before calling this.
const buildPointModifyCondition = ({ map, olFeature }) => (mapBrowserEvent) => {
  const pixel = map.getEventPixel(mapBrowserEvent.originalEvent)
  return !!map.forEachFeatureAtPixel(pixel, (feature) => feature === olFeature, { hitTolerance: PIXEL_TOLERANCE })
}

/**
 * Live invalid-stroke wiring for edit_point — unlike edit/EditMode.js's wireLiveStroke, this
 * must NOT call olFeature.setStyle(...): a Stroke/Fill style renders nothing for a Point (see
 * core/styles.js's own placeholder-style comment) and would make the icon vanish. There is
 * also no dashed-stroke visual for a point to begin with (validation/rules.js has no
 * Point-specific rule — see the module doc above), so onChange only relays the verdict to
 * gate the Done button, never touching the feature's style.
 */
const wirePointLiveValidity = ({ manager, olFeature }) => {
  const liveStroke = createLiveStroke({
    onChange: (invalid, reason) => {
      manager.emit(ADAPTER_EVENTS.VALIDITY_CHANGE, { valid: !invalid, reason })
    }
  })
  const updateLiveValidity = () => {
    const coordinates = olFeature.getGeometry().getCoordinates()
    liveStroke.update({
      feature: { type: 'Feature', geometry: { type: 'Point', coordinates } },
      context: { mode: 'edit_point' },
      numVertices: 1,
      onGeometryChange: manager._geometryValidator
    })
  }
  olFeature.getGeometry().on('change', updateLiveValidity)
  return {
    liveStroke,
    destroy () {
      olFeature.getGeometry().un('change', updateLiveValidity)
      liveStroke.destroy()
    }
  }
}

const wireTouchHandler = ({ map, container, manager, snap, undoStack, selection }) => {
  const { getState, setState, syncGeom, emitGeometryValidation } = selection

  const touchHandler = createTouchHandler({
    map,
    container,
    getState,
    setState,
    colors: manager.colors,
    snap,
    moveCoord: movePoint,
    onVertexMoved ({ vertexIndex, previousCoord }) {
      undoStack.push({ type: 'move_vertex', vertexIndex, previousCoord })
      syncGeom()
      emitGeometryValidation(MOVE_VERTEX, vertexIndex)
    },
    // A stray tap never relocates the point — only the offset-target drag and the D-pad do
    // (mirrors the ML adapter's editPointMode/touchHandlers.js onTap no-op).
    onTap () {}
  })

  selection.setHooks({
    onUpdate () {
      if (getState().interfaceType === TOUCH_INTERFACE) {
        touchHandler.updateTargetPosition()
      }
    }
  })

  return touchHandler
}

// Undo the last move — shared by the keyboard's Cmd/Ctrl+Z shortcut and the mode API's own
// undo() (Undo button/menu action), so both apply the exact same op-popping logic.
const createUndoAction = ({ olFeature, undoStack, selection }) => () => {
  const op = undoStack.pop()
  if (!op) {
    return
  }
  applyPointUndo(olFeature, op)
  selection.syncGeom()
  // An undo commits the inverse change, so it must re-validate like any other commit —
  // otherwise the Done gate could go stale. Always vertexIndex 0 — a point has only one.
  selection.emitGeometryValidation(MOVE_VERTEX, 0)
}

const wireKeyboardHandler = ({ map, container, snap, undoStack, selection, touchHandler, doUndo }) => {
  const { getState, setState, syncGeom, emitGeometryValidation } = selection

  return createKeyboardHandler({
    map,
    getState,
    setState,
    snap,
    moveCoord: movePoint,
    onVertexMoved ({ vertexIndex, previousCoord }) {
      undoStack.push({ type: 'move_vertex', vertexIndex, previousCoord })
      syncGeom()
      emitGeometryValidation(MOVE_VERTEX, vertexIndex)
    },
    // No midpoint concept for a point, so this is never actually reached — required by
    // createKeyboardHandler's interface all the same. Not reachable through this module's
    // public surface either, so there's no meaningful way to exercise it from a test.
    /* istanbul ignore next */
    onInserted () {},
    // No delete-vertex action for a point — deleteVertex() below is a documented no-op.
    onDeleted () {},
    onUndo: doUndo,
    onKeyboardActive () {
      if (getState().interfaceType === 'keyboard') {
        return
      }
      getState().interfaceType = 'keyboard'
      touchHandler.hide()
      container.focus({ preventScroll: true })
    }
  })
}

// Style hot-swap on map style change + touch-target reposition on map resize — mirrors
// edit/EditMode.js's wireMapSync, minus the vertex/midpoint handle layers a point has none of.
const wireMapSync = ({ map, manager, selection, touchHandler, live }) => {
  const { state } = selection

  const onStylesChanged = () => {
    live.liveStroke.refresh()
    touchHandler.updateColors(manager.colors)
  }
  manager.on(STYLES_CHANGED_EVENT, onStylesChanged)

  const onMapSizeChange = () => {
    if (state.interfaceType !== TOUCH_INTERFACE) {
      return
    }
    map.once('postrender', () => touchHandler.updateTargetPosition())
  }
  map.on('change:size', onMapSizeChange)

  return {
    destroy () {
      manager.off(STYLES_CHANGED_EVENT, onStylesChanged)
      map.un('change:size', onMapSizeChange)
    }
  }
}

/**
 * @returns {{ setInterfaceType, done, setInvalid, cancel, undo, deleteVertex, nudgeSelectedVertex, destroy } | null}
 */
export const createEditPointMode = ({ map, manager, options }) => {
  const { featureId, container, interfaceType, snap } = options
  const { store, undoStack } = manager

  const olFeature = store.getOL(featureId)
  if (!olFeature) {
    return null
  }

  // edit_vertex's first interaction is always a click that selects a vertex, which as a side
  // effect moves focus onto the map — satisfying keyboardHandler.js's isInteractiveElementFocused
  // guard. A point is already selected from the moment this mode starts, so a keyboard-only
  // session can go straight to arrow keys with no click in between; claim focus explicitly so
  // that guard reads correctly from the first keypress (mirrors the ML adapter's own fix).
  container?.focus({ preventScroll: true })

  const originalFeatureStyle = olFeature.getStyle()
  // Keeps showing the same "selected" (black ring) icon variant the interact plugin's own
  // highlight uses, for the whole edit session — a style FUNCTION, not a one-off Style
  // instance, so it re-reads manager.styles fresh on every render and survives a style
  // hot-swap without needing to be re-applied. See core/styles.js's selectedPointStyleFor.
  olFeature.setStyle(() => manager.styles.selectedPointStyleFor(olFeature))

  const selection = createPointSelectionState({ manager, store, olFeature, interfaceType })
  const { getState, setState } = selection

  const pointDrag = createPointDragInteraction({
    map,
    olFeature,
    getState,
    condition: buildPointModifyCondition({ map, olFeature }),
    snap,
    onModifyEnd (prevCoords) {
      selection.syncGeom()
      const op = prevCoords && deriveModifyOp(prevCoords, getState().vertices)
      if (!op) {
        return
      }
      undoStack.push(op)
      selection.emitGeometryValidation(MOVE_VERTEX, op.vertexIndex)
    }
  })

  const doUndo = createUndoAction({ olFeature, undoStack, selection })
  const live = wirePointLiveValidity({ manager, olFeature })
  const touchHandler = wireTouchHandler({ map, container, manager, snap, undoStack, selection })
  const keyboardHandler = wireKeyboardHandler({ map, container, snap, undoStack, selection, touchHandler, doUndo })
  const mapSync = wireMapSync({ map, manager, selection, touchHandler, live })

  return {
    setInterfaceType (type) {
      const state = getState()
      if (type === state.interfaceType) {
        return
      }
      setState({ interfaceType: type })
      if (type === TOUCH_INTERFACE) {
        touchHandler.updateTargetPosition()
      } else {
        touchHandler.hide()
      }
    },

    done () {
      manager.emit(ADAPTER_EVENTS.EDIT_FINISH, store.toGeoJSON(olFeature))
    },

    // Committed-verdict write (events.js): routed through the live-stroke controller so its
    // cached state stays in sync — see wirePointLiveValidity's own comment on why this never
    // touches the feature's style.
    setInvalid (invalid) {
      live.liveStroke.set(invalid)
    },

    // Nothing to restore here: the pre-edit feature is kept as tempFeature in the reducer and
    // events.js re-adds it on cancel.
    cancel () {},

    undo: doUndo,

    // Intentionally a no-op — deleting a Point's one coordinate isn't a "delete vertex"
    // action the way it is for a ring; whole-feature deletion is deleteFeature()'s job.
    // Matches MaplibreDrawAdapter.deleteVertex's existing no-op precedent.
    deleteVertex () {},

    // MoveControls' D-pad, routed here via mapProvider.activeMoveTarget (events.js) — claimed
    // once at construction (pointSelectionState's VERTEX_SELECTION) and held for the session.
    nudgeSelectedVertex: keyboardHandler.nudgeByDelta,

    destroy () {
      live.destroy()
      olFeature.setStyle(originalFeatureStyle)
      selection.destroy()
      mapSync.destroy()
      pointDrag.destroy()
      touchHandler.destroy()
      keyboardHandler.destroy()
    }
  }
}
