const buildDonePayload = (coords, selectedFeatures, selectedMarkers, selectionBounds) => ({
  ...(coords && { coords }),
  ...(!coords && selectedFeatures && { selectedFeatures }),
  ...(!coords && selectedMarkers?.length && { selectedMarkers }),
  ...(!coords && selectionBounds && { selectionBounds })
})

// Helper for feature toggling logic
const createFeatureHandler = (mapState, getPluginState) => (args, addToExisting) => {
  const pluginState = getPluginState()
  mapState.markers.remove('location')
  pluginState.dispatch({
    type: 'TOGGLE_SELECTED_FEATURES',
    payload: {
      multiSelect: pluginState.multiSelect,
      addToExisting,
      ...args
    }
  })
}

export function attachEvents ({
  getAppState,
  mapState,
  getPluginState,
  buttonConfig,
  events,
  eventBus,
  handleInteraction,
  clickReadyRef,
  closeApp
}) {
  const { selectDone, selectAtTarget, selectCancel } = buttonConfig
  const { viewportRef } = getAppState().layoutRefs

  // Keyboard Logic
  let enterOnViewport = false
  const handleKeydown = (e) => { enterOnViewport = e.key === 'Enter' && viewportRef.current === e.target }
  const handleKeyup = (e) => {
    if (e.key === 'Enter' && enterOnViewport) {
      e.preventDefault()
      handleSelectAtTarget()
    }
  }

  // Interaction Handlers
  const handleMapClick = (e) => {
    if (clickReadyRef.current) {
      handleInteraction(e)
    }
  }
  const handleSelectAtTarget = () => handleInteraction(mapState.crossHair.getDetail())

  const handleSelectDone = () => {
    const pluginState = getPluginState()
    const marker = mapState.markers.getMarker('location')
    const { coords } = marker || {}
    const { selectionBounds, selectedFeatures, selectedMarkers } = pluginState

    if (getAppState().disabledButtons.has('selectDone')) {
      return
    }

    eventBus.emit('interact:done', buildDonePayload(coords, selectedFeatures, selectedMarkers, selectionBounds))

    if (pluginState.closeOnAction ?? true) {
      closeApp()
    }
  }

  const handleSelectCancel = () => {
    eventBus.emit('interact:cancel')
    if (getPluginState().closeOnAction ?? true) {
      closeApp()
    }
  }

  const toggleFeature = createFeatureHandler(mapState, getPluginState)
  const handleSelect = (args) => toggleFeature(args, true)
  const handleUnselect = (args) => toggleFeature(args, false)

  // Attach Listeners
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('keyup', handleKeyup)
  eventBus.on(events.MAP_CLICK, handleMapClick)
  eventBus.on('interact:selectFeature', handleSelect)
  eventBus.on('interact:unselectFeature', handleUnselect)
  selectAtTarget.onClick = handleSelectAtTarget
  selectDone.onClick = handleSelectDone
  selectCancel.onClick = handleSelectCancel

  return () => {
    selectDone.onClick = null
    selectAtTarget.onClick = null
    selectCancel.onClick = null
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('keyup', handleKeyup)
    eventBus.off(events.MAP_CLICK, handleMapClick)
    eventBus.off('interact:selectFeature', handleSelect)
    eventBus.off('interact:unselectFeature', handleUnselect)
  }
}
