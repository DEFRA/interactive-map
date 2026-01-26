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
  const {
    selectDone,
    selectAtTarget,
    selectCancel
  } = buttonConfig

  const { viewportRef } = appState.layoutRefs

  let enterOnViewport = false
  const handleKeydown = (e) => {
    enterOnViewport = e.key === 'Enter' && viewportRef.current === e.target
  }
  document.addEventListener('keydown', handleKeydown)

  const handleKeyup = (e) => {
    if (e.key !== 'Enter' || !enterOnViewport) {
      return
    }
    e.preventDefault()
    handleSelectAtTarget()
  }
  document.addEventListener('keyup', handleKeyup)

  // Allow tapping on touch devices as well as accurate placement
  const handleMapClick = (e) => {
    handleInteraction(e)
  }
  eventBus.on(events.MAP_CLICK, handleMapClick)

  const handleSelectAtTarget = () => {
    handleInteraction(mapState.crossHair.getDetail())
  }
  selectAtTarget.onClick = handleSelectAtTarget
  
  const handleSelectDone = () => {
    const marker = mapState.markers.getMarker('location')
    const { coords } = marker || {}
    const { selectionBounds, selectedFeatures } = pluginState
    
    eventBus.emit('interact:done', {
      ...(coords && { coords }),
      ...(!coords && selectedFeatures && { selectedFeatures }),
      ...(!coords && selectionBounds && { selectionBounds })
    })

    if (!(pluginState.closeOnDone ?? true)) {
      return
    }

    closeApp()
  }
  selectDone.onClick = handleSelectDone

  const handleSelectCancel = () => {
    eventBus.emit('interact:cancel')

    if (!(pluginState.closeOnCancel ?? true)) {
      return
    }

    closeApp()
  }
  selectCancel.onClick = handleSelectCancel

  const handleToggleFeature = (args, addToExisting) => {
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
  const handleSelect = (args) => handleToggleFeature(args, true)
  const handleUnselect = (args) => handleToggleFeature(args, false)
  eventBus.on('interact:selectFeature', handleSelect)
  eventBus.on('interact:unselectFeature', handleUnselect)

  // Return cleanup function
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