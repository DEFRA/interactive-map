import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useMapItemList } from './hooks/useMapItemList.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { useHoverCursor } from './hooks/useHoverCursor.js'
import { attachEvents } from './events.js'
import { isSelectMarkerOnly } from './utils/interactionModes.js'

function useListboxCapable ({ enabled, interactionModes, markers, layers, eventBus }) {
  useEffect(() => {
    if (!enabled) { return }
    const hasLabeledMarkers = interactionModes?.includes('selectMarker') && markers.items.some(m => m.label)
    const hasFeatureLayers = interactionModes?.includes('selectFeature') && layers.some(l => l.labelProperty)
    if (hasLabeledMarkers || hasFeatureLayers) {
      eventBus.emit('interact:listboxcapable')
    }
  }, [enabled, interactionModes, markers, layers, eventBus])
}

export const InteractInit = ({
  appState,
  mapState,
  services,
  buttonConfig,
  mapProvider,
  pluginState
}) => {
  const { interfaceType } = appState
  const { dispatch, enabled, selectedFeatures, interactionModes, layers } = pluginState
  const { eventBus, closeApp } = services
  const { crossHair, mapStyle, markers } = mapState

  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(interfaceType)
  const selectMarkerOnly = isSelectMarkerOnly(interactionModes)

  useMapItemList({ mapState, pluginState, services, mapProvider })

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
    dispatch,
    events: EVENTS,
    eventBus
  })

  // Notify other components (e.g. Markers) whether interact is active
  useEffect(() => {
    eventBus.emit('interact:active', { active: enabled, interactionModes })
  }, [enabled, interactionModes])

  useListboxCapable({ enabled, interactionModes, markers, layers, eventBus })

  useHoverCursor(mapProvider, enabled, interactionModes, layers)

  // Toggle target marker visibility
  useEffect(() => {
    if (enabled && isTouchOrKeyboard && !(interfaceType === 'touch' && selectMarkerOnly)) {
      crossHair.fixAtCenter()
    } else {
      crossHair.hide()
    }
  }, [enabled, interfaceType, interactionModes])

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
      handleInteraction: (event) => handleInteractionRef.current(event),
      clickReadyRef,
      closeApp
    })

    return cleanupEvents
  }, [pluginState.enabled, buttonConfig, eventBus, closeApp])

  return null
}
