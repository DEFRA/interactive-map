import { createMidpointLayer } from './midpointLayer.js'
import { createVertexLayer } from './vertexLayer.js'
import { createActiveVertexLayer } from './activeVertexLayer.js'
import { createSelectionState } from './selectionState.js'
import { createModifyInteraction, deriveModifyOp } from './modifyInteraction.js'
import { createPointerHandlers } from './pointerHandlers.js'
import { createTouchHandler } from './touchHandler.js'
import { createKeyboardHandler } from './keyboardHandler.js'
import { deleteVertex, insertAtMidpoint } from './vertexOps.js'
import { applyUndo } from './undoOps.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'
import { STYLES_CHANGED_EVENT } from '../core/internalEvents.js'

const TOUCH_INTERFACE = 'touch'
const VERTEX_TYPE = 'vertex'

// Map an undo-op type onto the geometry-change `kind` consumed by validation.
const OP_KIND = {
  move_vertex: 'move',
  insert_vertex: 'insert',
  delete_vertex: 'delete'
}

// Undoing an op commits the inverse change (undo of a delete re-inserts, etc.),
// so its re-validation reports the inverse kind.
const UNDO_INVERSE_KIND = {
  move_vertex: 'move',
  insert_vertex: 'delete',
  delete_vertex: 'insert'
}

/**
 * Edit vertex mode — handles edit_vertex.
 *
 * createEditMode composes the OL pieces along their natural seams:
 *   - selectionState: shared mutable state + layer/event sync
 *   - modifyInteraction: OL Modify (pointer drag / midpoint insert) + undo-op derivation
 *   - pointerHandlers: mouse selection + delete-vertex button
 *   - touchHandler / keyboardHandler: touch drag and keyboard nudge input
 */

// Delete-selected-vertex and undo operations, shared by pointer, touch and keyboard input
const createVertexActions = ({ olFeature, undoStack, selection, getTouchHandler }) => {
  const { state, setState, syncGeom, emitGeometryValidation } = selection

  const doDeleteVertex = () => {
    if (state.selectedVertexType !== VERTEX_TYPE || state.selectedVertexIndex < 0) {
      return
    }
    const result = deleteVertex(olFeature, state.selectedVertexIndex)
    if (!result) {
      return
    }
    undoStack.push({ type: 'delete_vertex', vertexIndex: result.deletedIndex, deletedCoord: result.deletedCoord })
    syncGeom()
    emitGeometryValidation('delete', result.deletedIndex)
    setState({ selectedVertexIndex: -1, selectedVertexType: null })
  }

  const doUndo = () => {
    const op = undoStack.pop()
    if (!op) {
      return
    }
    const previousIndex = state.selectedVertexIndex
    const restoredIndex = applyUndo(olFeature, op)
    syncGeom()
    // An undo commits the inverse change, so it must re-validate like any other
    // commit — otherwise the invalid stroke and the Done gate go stale.
    emitGeometryValidation(UNDO_INVERSE_KIND[op.type], restoredIndex)
    // Only re-select if a vertex was already active — undo must not create a new selection
    const newIndex = previousIndex >= 0 ? restoredIndex : -1
    setState({
      selectedVertexIndex: newIndex,
      selectedVertexType: newIndex >= 0 ? VERTEX_TYPE : null
    })
    if (previousIndex >= 0 && newIndex >= 0 && state.interfaceType === TOUCH_INTERFACE) {
      getTouchHandler().updateTargetPosition()
    }
  }

  return { doDeleteVertex, doUndo }
}

const wireTouchHandler = ({ map, container, manager, snap, olFeature, undoStack, selection }) => {
  const { state, getState, setState, syncGeom, emitGeometryValidation } = selection
  const selectVertex = (index) => setState({ selectedVertexIndex: index, selectedVertexType: VERTEX_TYPE })

  const touchHandler = createTouchHandler({
    map,
    container,
    getState,
    setState,
    colors: manager.colors,
    snap,
    onVertexMoved ({ vertexIndex, previousCoord }) {
      undoStack.push({ type: 'move_vertex', vertexIndex, previousCoord })
      syncGeom()
      emitGeometryValidation('move', vertexIndex)
      selectVertex(vertexIndex)
      touchHandler.updateTargetPosition()
    },
    onTap (hit) {
      if (!hit) {
        setState({ selectedVertexIndex: -1, selectedVertexType: null })
        return
      }
      if (hit.type === VERTEX_TYPE) {
        selectVertex(hit.index)
        touchHandler.updateTargetPosition()
        return
      }
      // Only vertex and midpoint hits reach here, and the vertex case returned above
      const result = insertAtMidpoint(olFeature, state.midpoints, hit.index, state.vertices.length)
      if (!result) {
        return
      }
      undoStack.push({ type: 'insert_vertex', vertexIndex: result.insertedIndex })
      syncGeom()
      emitGeometryValidation('insert', result.insertedIndex)
      selectVertex(result.insertedIndex)
      touchHandler.updateTargetPosition()
    }
  })

  selection.setHooks({
    onDeselect: () => touchHandler.hide(),
    onUpdate () {
      if (state.interfaceType === TOUCH_INTERFACE) {
        touchHandler.updateTargetPosition()
      }
    }
  })

  return touchHandler
}

const wireKeyboardHandler = ({ map, container, snap, undoStack, selection, touchHandler, actions }) => {
  const { state, getState, setState, syncGeom, emitGeometryValidation } = selection

  return createKeyboardHandler({
    map,
    getState,
    setState,
    snap,
    onVertexMoved ({ vertexIndex, previousCoord }) {
      undoStack.push({ type: 'move_vertex', vertexIndex, previousCoord })
      syncGeom()
      emitGeometryValidation('move', vertexIndex)
      setState({ selectedVertexIndex: vertexIndex, selectedVertexType: VERTEX_TYPE })
    },
    onInserted ({ insertedIndex }) {
      undoStack.push({ type: 'insert_vertex', vertexIndex: insertedIndex })
      syncGeom()
      emitGeometryValidation('insert', insertedIndex)
    },
    onDeleted: actions.doDeleteVertex,
    onUndo: actions.doUndo,
    onKeyboardActive () {
      if (state.interfaceType === 'keyboard') {
        return
      }
      state.interfaceType = 'keyboard'
      touchHandler.hide()
      container.focus({ preventScroll: true })
    }
  })
}

// Style hot-swap on map style change + touch-target reposition on map resize
const wireMapSync = ({ map, manager, olFeature, layers, selection, touchHandler }) => {
  const { state } = selection

  const onStylesChanged = (styles) => {
    olFeature.setStyle(styles.editFeatureStyle)
    layers.vertexLayer.updateStyle(styles.vertexStyle)
    layers.midpointLayer.updateStyle(styles.midpointStyle)
    layers.activeLayer.update(state)
    touchHandler.updateColors(manager.colors)
  }
  manager.on(STYLES_CHANGED_EVENT, onStylesChanged)

  // Reposition the touch target after OL re-renders with the new size.
  // change:size fires before the render, so we wait for postrender to get
  // correct pixel coords from getPixelFromCoordinate.
  const onMapSizeChange = () => {
    if (state.interfaceType !== TOUCH_INTERFACE || state.selectedVertexIndex < 0) {
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

// The mode interface consumed by OLDrawManager
const buildModeApi = ({ manager, store, olFeature, originalFeatureStyle, selection, actions, parts }) => {
  const { state } = selection
  const { touchHandler } = parts

  return {
    setInterfaceType (type) {
      if (type === state.interfaceType) {
        return
      }
      state.interfaceType = type
      if (type === TOUCH_INTERFACE) {
        touchHandler.updateTargetPosition()
      } else {
        touchHandler.hide()
      }
    },

    done () {
      manager.emit(ADAPTER_EVENTS.EDIT_FINISH, store.toGeoJSON(olFeature))
    },

    // Swap the edited feature's stroke between solid (valid) and dashed (invalid).
    setInvalid (invalid) {
      olFeature.setStyle(invalid ? manager.styles.editFeatureStyleInvalid : manager.styles.editFeatureStyle)
    },

    // Nothing to restore here: the pre-edit feature is kept as tempFeature in the
    // reducer and events.js re-adds it on cancel
    cancel () {},

    undo: actions.doUndo,
    deleteVertex: actions.doDeleteVertex,

    destroy () {
      olFeature.setStyle(originalFeatureStyle)
      selection.destroy()
      parts.mapSync.destroy()
      parts.pointerHandlers.destroy()
      parts.modify.destroy()
      parts.layers.activeLayer.remove()
      parts.layers.midpointLayer.remove()
      parts.layers.vertexLayer.remove()
      touchHandler.destroy()
      parts.keyboardHandler.destroy()
    }
  }
}

/**
 * @returns {{ setInterfaceType, done, cancel, undo, deleteVertex, destroy } | null}
 */
export const createEditMode = ({ map, manager, options }) => {
  const { featureId, container, interfaceType, deleteVertexButtonId, snap } = options
  const { store, undoStack } = manager

  const olFeature = store.getOL(featureId)
  if (!olFeature) {
    return null
  }

  const originalFeatureStyle = olFeature.getStyle()
  olFeature.setStyle(manager.styles.editFeatureStyle)

  const midpointLayer = createMidpointLayer(map, manager.styles.midpointStyle)
  const vertexLayer = createVertexLayer(map, manager.styles.vertexStyle)
  const activeLayer = createActiveVertexLayer(map, () => manager.styles)

  const selection = createSelectionState({
    map,
    manager,
    store,
    olFeature,
    interfaceType,
    layers: { vertexLayer, midpointLayer, activeLayer }
  })
  const { state, getState, setState, syncGeom, emitGeometryValidation } = selection

  const modify = createModifyInteraction({
    map,
    olFeature,
    getState,
    onModifyEnd (prevCoords) {
      syncGeom()
      const op = prevCoords && deriveModifyOp(prevCoords, state.vertices)
      if (!op) {
        return
      }
      undoStack.push(op)
      emitGeometryValidation(OP_KIND[op.type], op.vertexIndex)
      setState({ selectedVertexIndex: op.vertexIndex, selectedVertexType: VERTEX_TYPE })
    }
  })

  syncGeom() // initial populate

  const layers = { vertexLayer, midpointLayer, activeLayer }
  const touchHandler = wireTouchHandler({ map, container, manager, snap, olFeature, undoStack, selection })
  const actions = createVertexActions({ olFeature, undoStack, selection, getTouchHandler: () => touchHandler })
  const keyboardHandler = wireKeyboardHandler({ map, container, snap, undoStack, selection, touchHandler, actions })
  const pointerHandlers = createPointerHandlers({
    map,
    container,
    getState,
    setState,
    touchHandler,
    deleteVertexButtonId,
    onDeleteVertex: actions.doDeleteVertex
  })
  const mapSync = wireMapSync({ map, manager, olFeature, layers, selection, touchHandler })

  return buildModeApi({
    manager,
    store,
    olFeature,
    originalFeatureStyle,
    selection,
    actions,
    parts: { touchHandler, keyboardHandler, pointerHandlers, modify, mapSync, layers }
  })
}
