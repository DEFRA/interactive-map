import { useEffect } from 'react'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { attachEvents } from './events.js'

export const InteractInit = ({
  appState,
  mapState,
  services,
  buttonConfig,
  mapProvider,
  pluginState
}) => {
  const { interfaceType } = appState
  const { dispatch, enabled, selectedFeatures, selectionBounds } = pluginState
  const { events, eventBus, closeApp } = services
  const { crossHair, mapStyle } = mapState

  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(interfaceType)

  // Core interaction logic (click > select/marker)
  const { handleInteraction } = useInteractionHandlers({
    appState,
    mapState,
    pluginState,
    services,
    mapProvider,
  })

  // Highlight features and sync state selectedBounds from mapProvider
  useHighlightSync({
    mapProvider,
    mapStyle,
    pluginState,
    selectedFeatures,
    selectionBounds,
    dispatch,
    events,
    eventBus
  })

  // Toggle target marker visibility
  useEffect(() => {
    if (enabled && isTouchOrKeyboard) {
      crossHair.fixAtCenter()
    } else {
      crossHair.hide()
    }
  }, [enabled, interfaceType])

  useEffect(() => {
    if (!pluginState.enabled) {
      return undefined // Explicit return
    }

    const cleanupEvents = attachEvents({
      appState,
      pluginState,
      mapState,
      buttonConfig,
      events,
      eventBus,
      handleInteraction,
      closeApp
    })
    
    return cleanupEvents
  }, [appState, mapState, pluginState, buttonConfig, eventBus, handleInteraction])


  return null
}
