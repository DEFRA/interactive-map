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

const createKeyboardHandlers = (viewportRef, onSelectAtTarget) => {
  let enterOnViewport = false
  const handleKeydown = (event) => { enterOnViewport = event.key === 'Enter' && viewportRef.current === event.target }
  const handleKeyup = (event) => {
    if (event.key === 'Enter' && enterOnViewport) {
      event.preventDefault()
      onSelectAtTarget()
    }
  }
  return { handleKeydown, handleKeyup }
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

  const handleSelectAtTarget = () => handleInteraction(mapState.crossHair.getDetail())
  const handleMapClick = (mapEvent) => { if (clickReadyRef.current) { handleInteraction(mapEvent) } }

  const { handleKeydown, handleKeyup } = createKeyboardHandlers(getAppState().layoutRefs.viewportRef, handleSelectAtTarget)

  const handleSelectDone = () => {
    const pluginState = getPluginState()
    const marker = mapState.markers.getMarker('location')
    const { coords } = marker || {}
    const { selectionBounds, selectedFeatures, selectedMarkers } = pluginState
    if (getAppState().disabledButtons.has('selectDone')) { return }
    eventBus.emit('interact:done', buildDonePayload(coords, selectedFeatures, selectedMarkers, selectionBounds))
    if (pluginState.closeOnAction ?? true) { closeApp() }
  }

  const handleSelectCancel = () => {
    eventBus.emit('interact:cancel')
    if (getPluginState().closeOnAction ?? true) { closeApp() }
  }

  const toggleFeature = createFeatureHandler(mapState, getPluginState)
  const handleSelect = (args) => toggleFeature(args, true)
  const handleUnselect = (args) => toggleFeature(args, false)

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
