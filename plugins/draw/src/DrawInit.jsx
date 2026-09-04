import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
  const { eventBus, hints } = services
  const { crossHair } = mapState
  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

  // Mirrored directly in the render body (not a separate effect — matches useVisibleGeometry.js's
  // own latestRef convention) so the crosshair effect's cleanup below can read the CURRENT
  // shouldShowCrosshair decision rather than the stale one captured when that effect last ran.
  // Without this, closing MoveControls (or leaving touch/keyboard) would fail to hide it: React
  // runs the old effect's cleanup with its original closure, which still sees the OLD
  // expandedButtons/interfaceType that made it visible in the first place.
  const shouldShowCrosshairRef = useRef(false)
  shouldShowCrosshairRef.current = ['draw_polygon', 'draw_line', 'draw_point'].includes(pluginState.mode) &&
    (isTouchOrKeyboard || appState.expandedButtons?.has('moveControls'))

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

  // Suppresses the accessible features list for the whole time a draw/edit session holds exclusive control of map interaction.
  useEffect(() => {
    eventBus.emit(EVENTS.MAP_SET_FEATURES_SUPPRESSED, { suppressed: pluginState.mode !== null })
    return () => {
      eventBus.emit(EVENTS.MAP_SET_FEATURES_SUPPRESSED, { suppressed: false })
    }
  }, [pluginState.mode, eventBus])

  useEffect(() => {
    if (!shouldShowCrosshairRef.current) {
      return undefined
    }
    const wasAlreadyVisible = crossHair.isVisible
    crossHair.fixAtCenter()
    return () => {
      // Only hide the crosshair if it wasn't visible before drawing AND it's not still needed
      // now (re-checked live via the ref, not this closure's original values — the user might
      // have switched input devices, or opened/closed MoveControls, since this effect last ran).
      if (!wasAlreadyVisible && !shouldShowCrosshairRef.current) {
        crossHair.hide()
      }
    }
  }, [pluginState.mode, appState.interfaceType, appState.expandedButtons])

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
