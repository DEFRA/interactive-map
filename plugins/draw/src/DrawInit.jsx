import { useEffect, useLayoutEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'
import { useSpatialList } from './hooks/useSpatialList.js'
import { APPLICATION_MODE_ID } from './defaults.js'
import { needsDrawTarget } from './utils/needsDrawTarget.js'
import { isDrawingMode, isSessionMode } from './utils/drawModes.js'
import { logger } from '../../../src/services/logger.js'

// Resolves in a later task, after any effects Preact is still running
const nextTask = () => new Promise(resolve => setTimeout(resolve, 0))

// Loads the draw adapter once per mount, once the map is ready; tears it down (and releases
// MapControls' D-pad) on unmount.
//
// The load starts in a later task. When the adapter is available straight away (its file is
// cached, or bundled with the plugin), creating it and changing plugin state in the same task
// as this effect makes Preact 10.29.6+ run the effect again without end (#622). Loading at most
// once per mount stops a repeat run creating a second adapter.
function useLoadDrawAdapter ({ mapState, pluginConfig, pluginState, mapProvider, eventBus, symbolRegistry }) {
  const isMountedRef = useRef(true)
  const isLoadStartedRef = useRef(false)

  useEffect(() => {
    if (!mapState.isMapReady || isLoadStartedRef.current) {
      return
    }
    isLoadStartedRef.current = true

    const load = async () => {
      await nextTask()
      if (!isMountedRef.current) {
        return
      }
      const adapter = await loadDrawAdapter(mapProvider, {
        mapStyle: mapState.mapStyle,
        snapLayers: pluginConfig.snapLayers,
        pluginConfig,
        events: EVENTS,
        eventBus,
        symbolRegistry
      })
      // Unmounted while loading: remove it rather than leave it attached to the map
      if (!isMountedRef.current) {
        adapter.remove()
        return
      }
      mapProvider.draw = adapter
      pluginState.dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: pluginConfig.snapLayers?.length > 0 })
      eventBus.emit('draw:ready')
    }

    load().catch((error) => logger.error('[draw] failed to load the draw adapter', error))
  }, [mapState.isMapReady])

  useEffect(() => () => {
    isMountedRef.current = false
    mapProvider.draw?.remove()
    mapProvider.draw = null
    // Release MapControls' D-pad if this plugin instance still held it.
    mapProvider.activeMoveTarget = null
  }, [])
}

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig, setApplicationMode, clearApplicationMode }) => {
  const { eventBus, hints, symbolRegistry } = services
  const { crossHair } = mapState

  useSpatialList({ mapState, pluginState, services, mapProvider, spatialListRegistry: appState.spatialListRegistry, viewportRef: appState.layoutRefs.viewportRef })

  // Mirrored in the render body so the crosshair effect's cleanup below can read the CURRENT
  // shouldShowCrosshair decision, not the stale one its closure captured when it last ran.
  const shouldShowCrosshairRef = useRef(false)
  // Not while a finished shape is held waiting on its check — there's nothing left to place.
  shouldShowCrosshairRef.current = !pluginState.holding && (needsDrawTarget({ appState, pluginState }) ||
    (isDrawingMode(pluginState.mode) && appState.interfaceType === 'keyboard'))

  useLoadDrawAdapter({ mapState, pluginConfig, pluginState, mapProvider, eventBus, symbolRegistry })

  // Enters the 'draw' application mode (declared in the manifest) in any draw/edit mode, and leaves it
  // when the draw/edit mode ends. useLayoutEffect so the class lands in the same paint as the change.
  useLayoutEffect(() => {
    if (!pluginState.mode) {
      clearApplicationMode(APPLICATION_MODE_ID)
      return undefined
    }
    setApplicationMode(APPLICATION_MODE_ID)
    return () => clearApplicationMode(APPLICATION_MODE_ID)
  }, [pluginState.mode])

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
      // the ref, since input device or MapControls state may have changed since this ran).
      if (!wasAlreadyVisible && !shouldShowCrosshairRef.current) {
        crossHair.hide()
      }
    }
  }, [pluginState.mode, appState.interfaceType, appState.expandedButtons])

  // Keep the active draw/edit session's interface type in sync so the touch offset target and
  // rubber band update immediately if the input device changes mid-session.
  useEffect(() => {
    if (!isSessionMode(pluginState.mode) || !mapProvider.draw) {
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
      hints,
      announce: services.announce
    })
  }, [mapProvider, appState, pluginState])
}
