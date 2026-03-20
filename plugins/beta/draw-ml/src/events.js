import { clearSnapState, getSnapInstance } from './utils/snapHelpers.js'

export function attachEvents ({ pluginState, mapProvider, buttonConfig, eventBus }) {
  const { drawDone, drawAddPoint, drawUndo, drawDeletePoint, drawSnap, drawCancel } = buttonConfig
  const { map, draw } = mapProvider
  const { dispatch, feature, tempFeature } = pluginState

  // --- Helper to disable snap
  const disableSnap = () => {
    mapProvider.snapEnabled = false
    dispatch({ type: 'SET_SNAP', payload: false })
    const snap = getSnapInstance(map)
    if (snap) {
      snap.setSnapStatus?.(false)
      clearSnapState(snap)
    }
    if (map.getLayer('snap-helper-circle')) {
      map.setLayoutProperty('snap-helper-circle', 'visibility', 'none')
    }
  }

  // --- Helper to reset draw mode and feature (without touching snap)
  const resetDrawModeAndFeature = () => {
    mapProvider.undoStack?.clear()
    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
  }

  // --- Button handlers
  const handleDone = () => {
    const mode = draw.getMode()

    disableSnap()
    mapProvider.undoStack?.clear()

    if (mode === 'edit_vertex') {
      map.fire('draw.editfinish', { features: [draw.get(tempFeature.id)] })
      return
    }

    if (!['draw_polygon', 'draw_line'].includes(mode)) {
      return
    }

    // Trigger onStop → ParentMode.onStop, which strips the rubber-band vertex
    // and fires draw.create once with the correct geometry.
    draw.changeMode('disabled')
  }

  const handleCancel = () => {
    draw.trash()
    if (tempFeature?.id) {
      draw.delete(tempFeature.id)
    }
    if (feature) {
      draw.add(feature)
    }
    disableSnap()
    draw.changeMode('disabled')
    resetDrawModeAndFeature()
    eventBus.emit('draw:cancelled', feature)
  }

  const handleUndo = () => {
    if (draw.getMode() === 'edit_vertex') {
      return
    }
    const undoStack = mapProvider.undoStack
    if (!undoStack?.length) {
      return
    }
    const operation = undoStack.pop()
    map._undoInProgress = true
    setTimeout(() => { map._undoInProgress = false }, 100)
    map.fire('draw.undo', { operation })
  }

  let lastToggleTime = 0
  const THROTTLE_MS = 300
  const handleSnap = () => {
    const now = Date.now()
    if (now - lastToggleTime < THROTTLE_MS) {
      return
    }
    lastToggleTime = now

    const newSnapState = !pluginState.snap
    dispatch({ type: 'TOGGLE_SNAP' })
    mapProvider.snapEnabled = newSnapState

    const snap = getSnapInstance(map)
    if (snap?.setSnapStatus) {
      snap.setSnapStatus(newSnapState)
    }

    if (!newSnapState && snap) {
      clearSnapState(snap)
      if (map.getLayer('snap-helper-circle')) {
        map.setLayoutProperty('snap-helper-circle', 'visibility', 'none')
      }
    }
  }

  // --- Map style update
  const handleStyleData = () => {
    const layers = map.getStyle().layers || []
    if (!layers.length || layers[layers.length - 1].source?.startsWith('mapbox-gl-draw')) {
      return
    }
    layers.filter(l => l.source?.startsWith('mapbox-gl-draw')).forEach(l => map.moveLayer(l.id))
  }

  // --- Draw completion handlers (create / edit)
  const handleDrawCompletion = (eventName) => (e) => {
    const newFeature = e.features[0]
    resetDrawModeAndFeature()
    setTimeout(() => draw.changeMode('disabled'), 0)
    eventBus.emit(eventName, newFeature)
  }

  // --- Draw update handler
  const handleUpdate = (e) => {
    const tempFeature = e.features[0]
    eventBus.emit('draw:updated', tempFeature)
  }

  const onCreate = handleDrawCompletion('draw:created')
  const onEditFinish = handleDrawCompletion('draw:edited')

  // --- Other map events
  const onVertexSelection = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e })
    eventBus.emit('draw:vertexselection', e)
  }
  const onVertexChange = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertecies: e.numVertecies } })
  }
  const onUndoChange = (e) => {
    dispatch({ type: 'SET_UNDO_STACK_LENGTH', payload: e.length })
  }

  // --- Register events
  drawDone.onClick = handleDone
  drawCancel.onClick = handleCancel
  drawUndo.onClick = handleUndo
  drawSnap.onClick = handleSnap

  map.on('styledata', handleStyleData)
  map.on('draw.cancel', handleCancel)
  map.on('draw.create', onCreate)
  map.on('draw.editfinish', onEditFinish)
  map.on('draw.update', handleUpdate)
  map.on('draw.vertexselection', onVertexSelection)
  map.on('draw.vertexchange', onVertexChange)
  map.on('draw.undochange', onUndoChange)

  // --- Cleanup
  return () => {
    [drawDone, drawAddPoint, drawUndo, drawDeletePoint, drawSnap, drawCancel].forEach(btn => {
      if (btn) {
        btn.onClick = null
      }
    })
    map.off('styledata', handleStyleData)
    map.off('draw.cancel', handleCancel)
    map.off('draw.create', onCreate)
    map.off('draw.editfinish', onEditFinish)
    map.off('draw.update', handleUpdate)
    map.off('draw.vertexselection', onVertexSelection)
    map.off('draw.vertexchange', onVertexChange)
    map.off('draw.undochange', onUndoChange)
  }
}
