import { useEffect, useLayoutEffect, useRef } from 'react'
import { EVENTS } from '../../../src/config/events.js'
import { loadDrawAdapter } from './adapters/loadDrawAdapter.js'
import { attachEvents } from './events.js'
import { useSpatialList } from './hooks/useSpatialList.js'
import { EXCLUSIVE_CONTROL_KEEP } from './defaults.js'

/**
 * Every button (not menu item), panel and control id currently registered, de-duplicated (one id
 * can name a button and its panel). Passed to a keep function so hosts can discover ids.
 *
 * @param {{ buttonConfig?: Object, panelConfig?: Object, controlConfig?: Object }} appState
 * @returns {string[]}
 */
export const getInterfaceItemIds = ({ buttonConfig = {}, panelConfig = {}, controlConfig = {} }) => [...new Set([
  ...Object.keys(buttonConfig).filter(id => !buttonConfig[id].isMenuItem),
  ...Object.keys(panelConfig),
  ...Object.keys(controlConfig)
])]

/**
 * Resolves the ids to keep visible while draw has exclusive control, from the exclusiveControl option.
 * Draw's own buttons don't need listing: core never hides a claiming plugin's own items.
 *
 * @param {boolean | { keep?: string[] | ((defaults: string[], context: { ids: string[] }) => string[]) }} [option]
 *   false opts out; keep as an array replaces the default list, as a function receives a copy of the
 *   defaults and every current item id and returns the list to keep.
 * @param {string[]} [ids=[]] - Every current button, panel and control id, for a keep function.
 * @returns {string[] | null} The ids to keep, or null when opted out.
 */
export const getExclusiveControlKeep = (option, ids = []) => {
  if (option === false) {
    return null
  }
  const keep = option?.keep ?? EXCLUSIVE_CONTROL_KEEP
  return typeof keep === 'function' ? keep([...EXCLUSIVE_CONTROL_KEEP], { ids }) : keep
}

// Loads the draw adapter once the map is ready and this plugin instance is in scope for the
// current app mode; tears it down (and releases MapControls' D-pad) on cleanup.
function useLoadDrawAdapter ({ mapState, appState, pluginConfig, pluginState, mapProvider, eventBus }) {
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
      // Release MapControls' D-pad if this plugin instance still held it.
      mapProvider.activeMoveTarget = null
    }
  }, [mapState.isMapReady, appState.mode])
}

export const DrawInit = ({ appState, appConfig, mapState, pluginConfig, pluginState, services, mapProvider, buttonConfig, setExclusiveControl }) => {
  const { eventBus, hints } = services
  const { crossHair } = mapState
  const isTouchOrKeyboard = ['touch', 'keyboard'].includes(appState.interfaceType)

  useSpatialList({ mapState, pluginState, services, mapProvider, spatialListRegistry: appState.spatialListRegistry, viewportRef: appState.layoutRefs.viewportRef })

  // Mirrored in the render body so the crosshair effect's cleanup below can read the CURRENT
  // shouldShowCrosshair decision, not the stale one its closure captured when it last ran.
  const shouldShowCrosshairRef = useRef(false)
  shouldShowCrosshairRef.current = ['draw_polygon', 'draw_line', 'draw_point'].includes(pluginState.mode) &&
    (isTouchOrKeyboard || appState.expandedButtons?.has('mapControls'))

  useLoadDrawAdapter({ mapState, appState, pluginConfig, pluginState, mapProvider, eventBus })

  // Takes exclusive control of the interface in any draw/edit mode: core hides every button, panel
  // and control not on the keep list (other than draw's own) until the mode ends, keeping them
  // mounted so their state survives. Hosts change the list with exclusiveControl: { keep },
  // or opt out with exclusiveControl: false (e.g. a single-task map whose other buttons are all
  // deliberate). useLayoutEffect so the class lands in the same paint as the mode change.
  useLayoutEffect(() => {
    if (pluginConfig.exclusiveControl === false) {
      return undefined
    }
    if (!pluginState.mode) {
      setExclusiveControl(false)
      return undefined
    }
    // Resolved on entering each mode (so a keep function runs once per mode, with current ids)
    const keep = getExclusiveControlKeep(pluginConfig.exclusiveControl, getInterfaceItemIds(appState))
    setExclusiveControl(true, { keep })
    return () => setExclusiveControl(false)
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
