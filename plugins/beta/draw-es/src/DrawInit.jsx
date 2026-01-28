import { useEffect } from 'react'
import { createSketchViewModel } from './sketchViewModel.js'
import { attachEvents } from './events.js'

export const DrawInit = ({ 
  appState, 
  mapState, 
  pluginConfig, 
  pluginState, 
  services, 
  mapProvider, 
  buttonConfig 
}) => {
  const { events, eventBus } = services
  const { mapColorScheme } = mapState.mapStyle || {}

  // Check if plugin should be active
  const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
  const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false
  const isActive = mapState.isMapReady && inModeWhitelist && !inExcludeModes

  // Initialize sketch components once
  useEffect(() => {
    if (!isActive || mapProvider.sketchViewModel) {
			return
		}
    
    const { sketchViewModel, sketchLayer, emptySketchLayer } = createSketchViewModel({
      pluginState,
      mapProvider,
      eventBus
    })

    mapProvider.sketchViewModel = sketchViewModel
    mapProvider.sketchLayer = sketchLayer
		mapProvider.emptySketchLayer = emptySketchLayer
    eventBus.emit('draw:ready')

    return () => {
      mapProvider.sketchViewModel = null
      mapProvider.sketchLayer = null
			mapProvider.emptySketchLayer = null
    }
  }, [mapState.isMapReady, appState.mode])

  // Attach/detach events
  useEffect(() => {
    if (!isActive || !mapProvider.sketchViewModel) {
			return
		}

    const cleanup = attachEvents({
      pluginState,
      mapProvider,
      events,
      eventBus,
      buttonConfig,
      mapColorScheme
    })

    return () => {
      cleanup()
    }
  }, [isActive, mapColorScheme, pluginState])
}