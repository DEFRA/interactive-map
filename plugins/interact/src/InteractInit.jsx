import { useEffect } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { useInteractionHandlers } from './hooks/useInteractionHandlers.js'
import { useMapItemList } from './hooks/useMapItemList.js'
import { useHighlightSync } from './hooks/useHighlightSync.js'
import { useHoverCursor } from './hooks/useHoverCursor.js'
import { useCrossHairVisibility } from './hooks/useCrossHairVisibility.js'
import { useAttachEvents } from './hooks/useAttachEvents.js'
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

  useCrossHairVisibility({ crossHair, enabled, selectMarkerOnly, appState })

  useAttachEvents({ pluginState, appState, mapState, buttonConfig, eventBus, handleInteraction, closeApp })

  return null
}
