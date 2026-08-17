import { useEffect } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
  const { eventBus, hints } = services
  const { crossHair } = mapState
  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

  useEffect(() => {
    const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
    const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false

    if (!mapState.isMapReady || !inModeWhitelist || inExcludeModes) {
      return undefined
    }

    let isMounted = true

    loadDrawAdapter(mapProvider, {
      mapStyle: mapState.mapStyle,
      snapLayers: pluginConfig.snapLayers,
      pluginConfig,
      events: EVENTS,
      eventBus
    }).then(adapter => {
      if (!isMounted) { return }
      mapProvider.draw = adapter
      pluginState.dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: pluginConfig.snapLayers?.length > 0 })
      eventBus.emit('draw:ready')
    })

    return () => {
      isMounted = false
      mapProvider.draw?.remove()
      mapProvider.draw = null
      // Release MoveControls' D-pad if this plugin instance still held it.
      mapProvider.activeMoveTarget = null
    }
  }, [mapState.isMapReady, appState.mode])

  useEffect(() => {
    if (['draw_polygon', 'draw_line', 'draw_point'].includes(pluginState.mode) && isTouchOrKeyboard) {
      const wasAlreadyVisible = crossHair.isVisible
      crossHair.fixAtCenter()
      return () => {
        // Only hide crosshair if it wasn't visible before drawing AND we're not currently
        // in keyboard/touch mode (user might have switched input devices during drawing).
        // This ensures crosshair stays visible if user switched to keyboard mid-drawing.
        if (!wasAlreadyVisible && !['touch', 'keyboard'].includes(appState.interfaceType)) {
          crossHair.hide()
        }
      }
    }
    return undefined
  }, [pluginState.mode, appState.interfaceType])

  // Keep the active draw/edit session in sync with the global interface type so
  // the touch offset target shows/hides, and the rubber band keeps following the
  // map, immediately when the input device changes mid-session (e.g. the user
  // starts drawing with the mouse then switches to touch and pans via MoveControls).
  useEffect(() => {
    if (!['edit_vertex', 'edit_point', 'draw_polygon', 'draw_line', 'draw_point'].includes(pluginState.mode) || !mapProvider.draw) {
      return undefined
    }
    mapProvider.draw.setInterfaceType(appState.interfaceType)
    return undefined
  }, [appState.interfaceType, pluginState.mode])

  // Attach events when plugin state or map provider changes
  useEffect(() => {
    if (!mapProvider.draw) {
      return undefined
    }

    return attachEvents({
      appState,
      appConfig,
      mapState,
      mapProvider,
      buttonConfig,
      pluginState,
      events: EVENTS,
      eventBus,
      hints
    })
  }, [mapProvider, appState, pluginState])
}
