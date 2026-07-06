/**
 * Button and map-event wiring for the draw plugin.
 *
 * Uses the normalised adapter interface (draw.on/off, draw.done(), draw.cancel(),
 * draw.setSnapEnabled(), etc.) so this file is map-framework-agnostic.
 * All MapLibre / OL specifics live in the adapter.
 */
import { ADAPTER_EVENTS } from './adapterEvents.js'

function createHandlers ({ pluginState, mapProvider, eventBus, resetState, disableSnap }) {
  const { draw } = mapProvider
  const { feature, tempFeature } = pluginState
  return {
    handleDone: () => { disableSnap(); draw.done() },
    handleCancel: () => {
      const mode = draw.getMode()
      if (mode === 'edit_vertex' && tempFeature?.id) { draw.add(feature) }
      disableSnap(); draw.cancel(); resetState()
      eventBus.emit('draw:cancelled', feature)
    },
    handleUndo: () => draw.undo(),
    handleDeleteVertex: () => draw.deleteVertex(),
    handleSnap: () => {
      pluginState.dispatch({ type: 'TOGGLE_SNAP' })
      draw.setSnapEnabled(!pluginState.snap)
    },
    onCreate: (f) => { disableSnap(); resetState(); setTimeout(() => draw.changeMode('disabled'), 0); eventBus.emit('draw:created', f) },
    onEditFinish: (f) => { disableSnap(); resetState(); setTimeout(() => draw.changeMode('disabled'), 0); eventBus.emit('draw:edited', f) },
    onCancel: () => {},
    onVertexSelection: (e) => { pluginState.dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e }); eventBus.emit('draw:vertexselection', e) },
    onVertexChange: (e) => { pluginState.dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertices: e.numVertices } }) },
    onUndoChange: (l) => { pluginState.dispatch({ type: 'SET_UNDO_STACK_LENGTH', payload: l }) },
    onUpdate: (f) => { eventBus.emit('draw:updated', f) }
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
}

export function attachEvents ({ pluginState, mapProvider, buttonConfig, eventBus }) {
  const { draw } = mapProvider
  const resetState = () => {
    pluginState.dispatch({ type: 'SET_MODE', payload: null })
    pluginState.dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
  }
  const disableSnap = () => {
    pluginState.dispatch({ type: 'SET_SNAP', payload: false })
    draw.setSnapEnabled(false)
  }
  const handlers = createHandlers({ pluginState, mapProvider, eventBus, resetState, disableSnap })
  attachButtonHandlers(buttonConfig, handlers)
  attachDrawEvents(draw, handlers)
  return () => { detachButtonHandlers(buttonConfig); detachDrawEvents(draw, handlers) }
}
