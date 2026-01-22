export function attachEvents ({ appState, appConfig, mapState, pluginState, mapProvider, buttonConfig, eventBus }) {
  const {
    drawDone,
    drawAddPoint,
    drawUndo,
    drawFinish,
    drawDeletePoint,
    drawSnap,
    drawCancel
  } = buttonConfig

  const { map, draw } = mapProvider
  const { dispatch, feature, tempFeature } = pluginState

  // --- Done
  const handleDone = () => {
    draw.changeMode('disabled')
    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null }})
    eventBus.emit('draw:done', { newFeature: tempFeature })
  }
  drawDone.onClick = handleDone

  // --- Cancel
  const handleCancel = () => {
    draw.delete(tempFeature.id)

    // Reinstate initial feature
    if (feature) {
      draw.add(feature)
    }
    draw.changeMode('disabled')

    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null }})
    eventBus.emit('draw:cancel', { originalFeature: feature })
  }
  drawCancel.onClick = handleCancel

  // --- Snap
  const handleSnap = () => {
    dispatch({ type: 'TOGGLE_SNAP' })
  }
  drawSnap.onClick = handleSnap

  // --- Map style change
  const handleStyleData = () => {
    const layers = map.getStyle().layers || []
    if (layers.length === 0 || layers[layers.length - 1].source?.startsWith('mapbox-gl-draw')) {
      return
    }
    layers.filter(l => l.source?.startsWith('mapbox-gl-draw')).forEach(l => map.moveLayer(l.id))
  }
  map.on('styledata', () => handleStyleData(map))

  // --- A new shape is created
  const onCreate = (e) => {
    const newFeature = e.features[0]
    dispatch({ type: 'SET_FEATURE', payload: { tempFeature: newFeature }})
    eventBus.emit('draw:create', e)

    // Switch straight to edit vertex mode
    dispatch({ type: 'SET_MODE', payload: 'edit_vertex'})

    setTimeout(() => {
      draw.changeMode('edit_vertex', {
        container: appState.layoutRefs.viewportRef.current,
        deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
        isPanEnabled: appState.interfaceType !== 'keyboard',
        interfaceType: appState.interfaceType,
        scale: { small: 1, medium: 1.5, large: 2 }[mapState.mapSize],
        featureId: newFeature.id,
        getSnapEnabled: () => pluginState.snap !== false
      })
    }, 0)
  }
  map.on('draw.create', onCreate)

  // --- A vertex is selected
  const onVertexSelection = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: e })
    eventBus.emit('draw:vertexselection', e)
  }
  map.on('draw.vertexselection', onVertexSelection)

  return () => {
    drawDone.onClick = null
    drawAddPoint.onClick = null
    drawUndo.onClick = null
    drawFinish.onClick = null
    drawDeletePoint.onClick = null
    drawSnap.onClick = null
    drawCancel.onClick = null
    map.off('styledata', handleStyleData)
    map.off('draw.create', onCreate)
    map.off('draw.vertexselection', onVertexSelection)
  }
}