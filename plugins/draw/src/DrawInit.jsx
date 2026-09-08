import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'
import { useSpatialList } from './hooks/useSpatialList.js'

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig }) => {
  const { eventBus, hints } = services
  const { crossHair } = mapState
  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

  useSpatialList({ mapState, pluginState, services, mapProvider, spatialListRegistry: appState.spatialListRegistry, viewportRef: appState.layoutRefs.viewportRef })

  // Mirrored in the render body so the crosshair effect's cleanup below can read the CURRENT
  // shouldShowCrosshair decision, not the stale one its closure captured when it last ran.
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

  // Suppresses the accessible spatial list for every draw/edit mode except edit_vertex, which
  // supplies its own list instead (useSpatialList.js above, claimed exclusively via the
  // registry) — every other mode still has nothing meaningful to show.
  useEffect(() => {
    const suppressed = pluginState.mode !== null && pluginState.mode !== 'edit_vertex'
    eventBus.emit(EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed })
    return () => {
      eventBus.emit(EVENTS.MAP_SET_SPATIAL_LIST_SUPPRESSED, { suppressed: false })
    }
  }, [pluginState.mode, eventBus])

  useEffect(() => {
    if (!shouldShowCrosshairRef.current) {
      return undefined
    }
    const wasAlreadyVisible = crossHair.isVisible
    crossHair.fixAtCenter()
    return () => {
      // Only hide it if it wasn't visible before AND isn't still needed now (checked live via
      // the ref, since input device or MoveControls state may have changed since this ran).
      if (!wasAlreadyVisible && !shouldShowCrosshairRef.current) {
        crossHair.hide()
      }
    }
  }, [pluginState.mode, appState.interfaceType, appState.expandedButtons])

  // Keep the active draw/edit session's interface type in sync so the touch offset target and
  // rubber band update immediately if the input device changes mid-session.
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
