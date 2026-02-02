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

  // Helper to disable snap and hide indicators
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

  // --- Done
  const handleDone = () => {
    disableSnap()
    draw.changeMode('disabled')
    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null }})
    eventBus.emit('draw:done', { newFeature: tempFeature })
  }
  drawDone.onClick = handleDone

  // --- Cancel
  const handleCancel = () => {
    if (tempFeature?.id) {
      draw.delete(tempFeature.id)
    }

    // Reinstate initial feature
    if (feature) {
      draw.add(feature)
    }
    disableSnap()
    draw.changeMode('disabled')

    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null }})
    eventBus.emit('draw:cancel', { originalFeature: feature })
  }
  drawCancel.onClick = handleCancel

  // --- Finish shape (programmatically complete the drawing)
  const handleFinish = () => {
    const mode = draw.getMode()
    if (!['draw_polygon', 'draw_line'].includes(mode)) {
      return
    }

    const features = draw.getAll().features
    if (features.length === 0) {
      return
    }

    const feature = features[0]
    const geom = feature.geometry

    // Remove the rubber band point (last coordinate that follows cursor)
    if (geom.type === 'Polygon') {
      // Polygon coords: [v1, v2, v3, ..., rubberBand, v1(closing)]
      // Remove rubber band (second to last) and keep the ring closed
      const ring = geom.coordinates[0]
      geom.coordinates[0] = [...ring.slice(0, -2), ring[0]]
    } else {
      // Line coords: [v1, v2, v3, ..., rubberBand]
      // Remove the rubber band (last point)
      geom.coordinates = geom.coordinates.slice(0, -1)
    }

    // Fire draw.create to trigger the standard completion flow
    map.fire('draw.create', { features: [feature] })

    // Change mode to trigger cleanup (this calls onStop on the draw mode)
    draw.changeMode('simple_select', { featureIds: [feature.id] })
  }
  drawFinish.onClick = handleFinish

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
  map.on('styledata', () => handleStyleData())

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

  // --- Vertex count changes during drawing
  const onVertexChange = (e) => {
    dispatch({ type: 'SET_SELECTED_VERTEX_INDEX', payload: { index: -1, numVertecies: e.numVertecies } })
  }
  map.on('draw.vertexchange', onVertexChange)

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
    map.off('draw.vertexchange', onVertexChange)
  }
}