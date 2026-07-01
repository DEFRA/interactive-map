/**
 * Button and map-event wiring for the draw plugin.
 *
 * Uses the normalised adapter interface (draw.on/off, draw.done(), draw.cancel(),
 * draw.setSnapEnabled(), etc.) so this file is map-framework-agnostic.
 * All MapLibre / OL specifics live in the adapter.
 */
export function attachEvents ({ pluginState, mapProvider, buttonConfig, eventBus }) {
  const { drawDone, drawCancel, drawUndo, drawDeletePoint, drawSnap } = buttonConfig
  const { draw } = mapProvider
  const { dispatch, feature, tempFeature } = pluginState

  const resetState = () => {
    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
  }

  const disableSnap = () => {
    dispatch({ type: 'SET_SNAP', payload: false })
    draw.setSnapEnabled(false)
  }

  const handleDone = () => {
    disableSnap()
    draw.done()
  }

  const handleCancel = () => {
    const mode = draw.getMode()
    if (mode === 'edit_vertex' && tempFeature?.id) {
      draw.add(feature)
    }
    disableSnap()
    draw.cancel()
    resetState()
    eventBus.emit('draw:cancelled', feature)
  }

  const handleUndo = () => { draw.undo() }

  const handleDeleteVertex = () => { draw.deleteVertex() }

  const handleSnap = () => {
    const newSnapState = !pluginState.snap
    dispatch({ type: 'TOGGLE_SNAP' })
    draw.setSnapEnabled(newSnapState)
  }

  const onCreate = (geojsonFeature) => {
    disableSnap()
    resetState()
    setTimeout(() => draw.changeMode('disabled'), 0)
    eventBus.emit('draw:created', geojsonFeature)
  }

  const onEditFinish = (geojsonFeature) => {
    disableSnap()
    resetState()
    setTimeout(() => draw.changeMode('disabled'), 0)
    eventBus.emit('draw:edited', geojsonFeature)
  }

  const onCancel = () => {}

  const onVertexSelection = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e })
    eventBus.emit('draw:vertexselection', e)
  }

  const onVertexChange = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertices: e.numVertices } })
  }

  const onUndoChange = (length) => {
    dispatch({ type: 'SET_UNDO_STACK_LENGTH', payload: length })
  }

  const onUpdate = (geojsonFeature) => {
    eventBus.emit('draw:updated', geojsonFeature)
  }

  drawDone.onClick = handleDone
  drawCancel.onClick = handleCancel
  drawUndo.onClick = handleUndo
  if (drawDeletePoint) { drawDeletePoint.onClick = handleDeleteVertex }
  if (drawSnap) { drawSnap.onClick = handleSnap }

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
    if (drawDeletePoint) { drawDeletePoint.onClick = null }
    if (drawSnap) { drawSnap.onClick = null }

    draw.off('create', onCreate)
    draw.off('editfinish', onEditFinish)
    draw.off('cancel', onCancel)
    draw.off('vertexselection', onVertexSelection)
    draw.off('vertexchange', onVertexChange)
    draw.off('undochange', onUndoChange)
    draw.off('update', onUpdate)
  }
}
