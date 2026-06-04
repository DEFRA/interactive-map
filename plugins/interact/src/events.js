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
  clickReadyRef
}) {
  const { selectAtTarget } = buttonConfig

  const handleSelectAtTarget = () => handleInteraction(mapState.crossHair.getDetail())
  const handleMapClick = (mapEvent) => { if (clickReadyRef.current) { handleInteraction(mapEvent) } }

  const { handleKeydown, handleKeyup } = createKeyboardHandlers(getAppState().layoutRefs.viewportRef, handleSelectAtTarget)

  const toggleFeature = createFeatureHandler(mapState, getPluginState)
  const handleSelect = (args) => toggleFeature(args, true)
  const handleUnselect = (args) => toggleFeature(args, false)

  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('keyup', handleKeyup)
  eventBus.on(events.MAP_CLICK, handleMapClick)
  eventBus.on('interact:selectFeature', handleSelect)
  eventBus.on('interact:unselectFeature', handleUnselect)
  selectAtTarget.onClick = handleSelectAtTarget

  return () => {
    selectAtTarget.onClick = null
    document.removeEventListener('keydown', handleKeydown)
    document.removeEventListener('keyup', handleKeyup)
    eventBus.off(events.MAP_CLICK, handleMapClick)
    eventBus.off('interact:selectFeature', handleSelect)
    eventBus.off('interact:unselectFeature', handleUnselect)
  }
}
