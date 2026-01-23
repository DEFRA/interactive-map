import { clearSnapState, getSnapInstance } from './snapHelpers.js'

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

  // --- Snap toggle with throttle to prevent Safari slowdown
  let lastToggleTime = 0
  const THROTTLE_MS = 300

  const handleSnap = () => {
    // Strict throttle - ignore clicks within throttle window
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

    // Clear all snap state when disabling - prevents accumulation
    if (!newSnapState && snap) {
      clearSnapState(snap)
      // Hide indicator immediately when disabling (single call, not in RAF)
      if (map.getLayer('snap-helper-circle')) {
        map.setLayoutProperty('snap-helper-circle', 'visibility', 'none')
      }
    }
    // When enabling, the indicator will show automatically via setMapData patch
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
        getSnapEnabled: () => mapProvider.snapEnabled === true
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