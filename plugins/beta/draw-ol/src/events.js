/**
 * Button and manager event wiring for the OL draw plugin.
 * Mirrors draw-ml/events.js structure but uses manager.on/off instead of map.on/off.
 */
export function attachEvents ({ pluginState, mapProvider, buttonConfig, eventBus }) {
  const { drawDone, drawCancel, drawUndo, drawDeletePoint } = buttonConfig
  const { draw } = mapProvider
  const { dispatch, feature, tempFeature } = pluginState

  const resetState = () => {
    draw.undoStack.clear()
    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
  }

  // --- Button handlers ---

  const handleDone = () => {
    draw.undoStack.clear()
    draw.done()
  }

  const handleCancel = () => {
    const mode = draw.getMode()
    if (mode === 'edit_vertex' && tempFeature?.id) {
      // Restore original geometry by re-adding the pre-edit feature
      draw.add(feature)
    }
    draw.cancel()
    resetState()
    eventBus.emit('draw:cancelled', feature)
  }

  const handleUndo = () => {
    draw.undo()
  }

  const handleDeleteVertex = () => {
    draw.deleteVertex()
  }

  // --- Manager event handlers ---

  const onCreate = (geojsonFeature) => {
    resetState()
    draw.changeMode('disabled')
    eventBus.emit('draw:created', geojsonFeature)
  }

  const onEditFinish = (geojsonFeature) => {
    resetState()
    draw.changeMode('disabled')
    eventBus.emit('draw:edited', geojsonFeature)
  }

  const onCancel = () => {
    // Fired by draw.cancel() / drawabort — only when not user-initiated via button
  }

  const onVertexSelection = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e })
    eventBus.emit('draw:vertexselection', e)
  }

  const onVertexChange = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertecies: e.numVertecies } })
  }

  const onUndoChange = (length) => {
    dispatch({ type: 'SET_UNDO_STACK_LENGTH', payload: length })
  }

  const onUpdate = (geojsonFeature) => {
    eventBus.emit('draw:updated', geojsonFeature)
  }

  // --- Wire up ---

  drawDone.onClick = handleDone
  drawCancel.onClick = handleCancel
  drawUndo.onClick = handleUndo
  if (drawDeletePoint) drawDeletePoint.onClick = handleDeleteVertex

  draw.on('create', onCreate)
  draw.on('editfinish', onEditFinish)
  draw.on('cancel', onCancel)
  draw.on('vertexselection', onVertexSelection)
  draw.on('vertexchange', onVertexChange)
  draw.on('undochange', onUndoChange)
  draw.on('update', onUpdate)

  return () => {
    drawDone.onClick = null
    drawCancel.onClick = null
    drawUndo.onClick = null
    if (drawDeletePoint) drawDeletePoint.onClick = null

    draw.off('create', onCreate)
    draw.off('editfinish', onEditFinish)
    draw.off('cancel', onCancel)
    draw.off('vertexselection', onVertexSelection)
    draw.off('vertexchange', onVertexChange)
    draw.off('undochange', onUndoChange)
    draw.off('update', onUpdate)
  }
}
