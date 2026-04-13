import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { useHoverCursor } from './hooks/useHoverCursor.js'
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
  const { dispatch, enabled, selectedFeatures, selectionBounds, interactionModes, layers } = pluginState
  const { eventBus, closeApp } = services
  const { crossHair, mapStyle } = mapState

  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(interfaceType)

  // Core interaction logic (click > select/marker)
  const { handleInteraction } = useInteractionHandlers({
    appState,
    mapState,
    pluginState,
    services,
    mapProvider
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
    events: EVENTS,
    eventBus
  })

  // Notify other components (e.g. Markers) whether interact is active
  useEffect(() => {
    eventBus.emit('interact:active', { active: enabled, interactionModes })
  }, [enabled, interactionModes])

  useHoverCursor(mapProvider, enabled, interactionModes, layers)

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
      events: EVENTS,
      eventBus,
      handleInteraction: (e) => handleInteractionRef.current(e),
      clickReadyRef,
      closeApp
    })

    return cleanupEvents
  }, [pluginState.enabled, buttonConfig, eventBus, closeApp])

  return null
}
