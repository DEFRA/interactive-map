import { useEffect, useRef } from 'react'
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

  // Refs updated synchronously each render — keeps callbacks fresh without re-attaching events
  const handleInteractionRef = useRef(handleInteraction)
  handleInteractionRef.current = handleInteraction

  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  const appStateRef = useRef(appState)
  appStateRef.current = appState

  // Defer click handling by one macrotask so any click that triggered the enable
  // (e.g. finishing a draw gesture) fires before this handler is live.
  // Managed separately from attachEvents so re-runs of that effect don't reset it —
  // only resets when enabled actually changes.
  const clickReadyRef = useRef(false)
  useEffect(() => {
    clickReadyRef.current = false
    const timer = setTimeout(() => { clickReadyRef.current = true }, 0)
    return () => clearTimeout(timer)
  }, [pluginState.enabled])

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
      getAppState: () => appStateRef.current,
      mapState,
      getPluginState: () => pluginStateRef.current,
      buttonConfig,
      events,
      eventBus,
      handleInteraction: (e) => handleInteractionRef.current(e),
      clickReadyRef,
      closeApp
    })

    return cleanupEvents
  }, [pluginState.enabled, buttonConfig, events, eventBus, closeApp])


  return null
}
