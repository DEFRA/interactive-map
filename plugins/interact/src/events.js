// Helper for feature toggling logic
const createFeatureHandler = (mapState, pluginState) => (args, addToExisting) => {
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
  appState,
  mapState,
  pluginState,
  buttonConfig,
  events,
  eventBus,
  handleInteraction,
  closeApp
}) {
  const { selectDone, selectAtTarget, selectCancel } = buttonConfig
  const { viewportRef } = appState.layoutRefs

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
  // Defer click handling by one macrotask so any click that triggered the enable
  // (e.g. finishing a draw gesture) fires before this handler is live.
  let clickReady = false
  const clickReadyTimer = setTimeout(() => { clickReady = true }, 0)
  const handleMapClick = (e) => { if (clickReady) { handleInteraction(e) } }
  const handleSelectAtTarget = () => handleInteraction(mapState.crossHair.getDetail())

  const handleSelectDone = () => {
    const marker = mapState.markers.getMarker('location')
    const { coords } = marker || {}
    const { selectionBounds, selectedFeatures } = pluginState
    
    if (appState.disabledButtons.has('selectDone')) {
      return
    }

    eventBus.emit('interact:done', {
      ...(coords && { coords }),
      ...(!coords && selectedFeatures && { selectedFeatures }),
      ...(!coords && selectionBounds && { selectionBounds })
    })

    if (pluginState.closeOnAction ?? true) {
      closeApp()
    }
  }

  const handleSelectCancel = () => {
    eventBus.emit('interact:cancel')
    if (pluginState.closeOnAction ?? true) {
      closeApp()
    }
  }

  const toggleFeature = createFeatureHandler(mapState, pluginState)
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
    clearTimeout(clickReadyTimer)
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