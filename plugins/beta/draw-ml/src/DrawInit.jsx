import { useEffect } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { attachEvents } from './events.js'
import { createMapboxDraw } from './mapboxDraw.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
  const { eventBus } = services
  const { crossHair } = mapState
  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

  // Create draw instance once
  useEffect(() => {
    // Don't run init if the app is in non-specified mode
    const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
    const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false

    if (!mapState.isMapReady || !inModeWhitelist || inExcludeModes) {
      return
    }

    const { remove } = createMapboxDraw({
      mapStyle: mapState.mapStyle,
      snapLayers: pluginConfig.snapLayers,
      mapProvider,
      events: EVENTS,
      eventBus
    })

    // Initialize snap layers flag from config
    pluginState.dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: pluginConfig.snapLayers?.length > 0 })

    // Draw ready
    eventBus.emit('draw:ready')

    return () => remove()
  }, [mapState.isMapReady, appState.mode])

  // Keep draw instance aware of the crossHair API so draw modes can use show/hide
  // (rather than direct DOM manipulation which conflicts with React's controlled display style)
  useEffect(() => {
    if (mapProvider.draw) {
      mapProvider.draw._crossHair = crossHair
    }
  }, [mapProvider.draw, crossHair])

  // Show crosshair immediately on touch/keyboard when entering draw mode
  useEffect(() => {
    if (['draw_polygon', 'draw_line'].includes(pluginState.mode) && isTouchOrKeyboard) {
      const wasAlreadyVisible = crossHair.isVisible
      crossHair.fixAtCenter()
      return () => {
        if (!wasAlreadyVisible) {
          crossHair.hide()
        }
      }
    }
  }, [pluginState.mode, appState.interfaceType])

  // Keep edit mode in sync with the global interface type so the touch
  // offset target shows/hides immediately when the input device changes
  // (e.g. switching between stylus/touch and mouse on a Surface tablet).
  useEffect(() => {
    if (pluginState.mode !== 'edit_vertex' || !mapProvider.map) {
      return undefined
    }
    mapProvider.map.fire('draw.interfacetypechange', { interfaceType: appState.interfaceType })
    return undefined
  }, [appState.interfaceType, pluginState.mode])

  // Attach events when plgin state changes
  useEffect(() => {
    if (!mapProvider.draw) {
      return
    }

    const cleanupEvents = attachEvents({
      appState,
      appConfig,
      mapState,
      mapProvider,
      buttonConfig,
      pluginState,
      events: EVENTS,
      eventBus
    })

    return () => cleanupEvents()
  }, [mapProvider, appState, pluginState])
}
