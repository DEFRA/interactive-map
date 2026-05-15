import { useEffect } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { createOLDraw } from './olDraw.js'
import { attachEvents } from './events.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
  const { eventBus } = services
  const { crossHair } = mapState
  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

  // Create the OLDrawManager once when the map is ready
  useEffect(() => {
    const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
    const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false
    if (!mapState.isMapReady || !inModeWhitelist || inExcludeModes) return

    const { remove } = createOLDraw({ mapProvider, events: EVENTS, eventBus })

    pluginState.dispatch({ type: 'SET_MODE', payload: null })
    eventBus.emit('draw:ready')

    return () => remove()
  }, [mapState.isMapReady, appState.mode])

  // Show crosshair when entering draw mode on touch/keyboard
  useEffect(() => {
    if (['draw_polygon', 'draw_line'].includes(pluginState.mode) && isTouchOrKeyboard) {
      const wasVisible = crossHair.isVisible
      crossHair.fixAtCenter()
      return () => {
        if (!wasVisible) crossHair.hide()
      }
    }
  }, [pluginState.mode, appState.interfaceType])

  // Keep edit mode in sync with the global interface type so the touch
  // offset target hides immediately when the user switches to mouse/keyboard.
  useEffect(() => {
    if (pluginState.mode !== 'edit_vertex' || !mapProvider.draw) return
    mapProvider.draw.setInterfaceType(appState.interfaceType)
  }, [appState.interfaceType, pluginState.mode])

  // Re-attach events when state changes
  useEffect(() => {
    if (!mapProvider.draw) return

    return attachEvents({
      appState,
      appConfig,
      mapState,
      mapProvider,
      buttonConfig,
      pluginState,
      events: EVENTS,
      eventBus
    })
  }, [mapProvider, appState, pluginState])
}
