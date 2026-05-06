import { useCallback, useEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useMapItemList } from './hooks/useMapItemList.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { useHoverCursor } from './hooks/useHoverCursor.js'
import { attachEvents } from './events.js'
import { isSelectMarkerOnly } from './utils/interactionModes.js'
import { getInterfaceType, subscribeToInterfaceChangesImmediate } from '../../../src/utils/detectInterfaceType.js'

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
  const { dispatch, enabled, selectedFeatures, interactionModes, layers } = pluginState
  const { eventBus, closeApp } = services
  const { crossHair, mapStyle, markers } = mapState

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

  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const selectMarkerOnlyRef = useRef(selectMarkerOnly)
  selectMarkerOnlyRef.current = selectMarkerOnly
  const crossHairRef = useRef(crossHair)
  crossHairRef.current = crossHair
  const listboxFocusRef = useRef(false)

  const updateCrossHair = useCallback(() => {
    const type = getInterfaceType()
    const isToK = ['touch', 'keyboard'].includes(type)
    if (enabledRef.current && !listboxFocusRef.current && isToK && !(type === 'touch' && selectMarkerOnlyRef.current)) {
      crossHairRef.current.fixAtCenter()
    } else {
      crossHairRef.current.hide()
    }
  }, [])

  // Toggle target marker visibility on enabled/interactionModes changes
  useEffect(() => {
    updateCrossHair()
  }, [enabled, interactionModes, updateCrossHair])

  // Toggle target marker visibility immediately on interface type change (no 150ms React delay)
  useEffect(() => {
    return subscribeToInterfaceChangesImmediate(updateCrossHair)
  }, [updateCrossHair])

  // Hide crosshair when listbox has focus
  useEffect(() => {
    const container = appState.layoutRefs?.appContainerRef?.current
    if (!container) { return undefined }
    const handleFocusIn = (e) => {
      const inListbox = !!e.target.closest('[role="listbox"], [role="option"]')
      if (listboxFocusRef.current !== inListbox) {
        listboxFocusRef.current = inListbox
        updateCrossHair()
      }
    }
    container.addEventListener('focusin', handleFocusIn)
    return () => { container.removeEventListener('focusin', handleFocusIn) }
  }, [appState.layoutRefs, updateCrossHair])

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
