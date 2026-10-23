// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { loadLayerAdapter } from '../adapters/loadLayerAdapter.js'
import { hasLayersMenu } from '../utils/hasLayersMenu.js'
import { getPanelElementId } from '../../../../src/utils/getPanelElementId.js'

const LAYERS_PANEL_ID = 'datasetsLayers'

// Closes the Layers panel if its menu empties while it's open
function useCloseEmptyLayersPanel ({ appConfig, appState, pluginConfig, pluginState, services }) {
  const { eventBus, focusMap } = services
  const hasMenu = hasLayersMenu({ pluginConfig, pluginState })
  const isLayersPanelOpen = Boolean(appState.openPanels[LAYERS_PANEL_ID])
  const focusFrameRef = useRef(null)

  useEffect(() => {
    if (hasMenu || !isLayersPanelOpen) {
      return
    }
    const panelEl = document.getElementById(getPanelElementId(appConfig.id, LAYERS_PANEL_ID))
    const hadFocus = Boolean(panelEl?.contains(document.activeElement))
    eventBus.emit(EVENTS.APP_HIDE_PANEL, LAYERS_PANEL_ID)
    if (hadFocus) {
      // Let the panel close and release modal focus/inert first, as Panel's handleClose does
      focusFrameRef.current = requestAnimationFrame(() => focusMap())
    }
  }, [hasMenu, isLayersPanelOpen])

  useEffect(() => () => cancelAnimationFrame(focusFrameRef.current), [])
}

export function DatasetsInit ({ appConfig, appState, pluginConfig, pluginState, mapState, mapProvider, services }) {
  const { dispatch, datasetRegistry } = pluginState
  const { eventBus, symbolRegistry, patternRegistry } = services
  const isBaseMapReady = Boolean(mapProvider?.isBaseMapReady())

  useCloseEmptyLayersPanel({ appConfig, appState, pluginConfig, pluginState, services })

  // Keep a ref to the latest pluginState so event handlers can access current data
  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  // Track initialisation and store cleanup function
  const datasetsInstanceRef = useRef(null)

  // Call layerAdapter methods queued from state updates. They wait until the adapter has loaded.
  const runQueuedActions = (actionsArray) => {
    const layerAdapter = mapProvider?.datasets
    if (!actionsArray.length || !layerAdapter) { return }
    actionsArray.forEach(({ method, parameters }) => layerAdapter[method](...parameters))
    dispatch({ type: 'REMOVE_ADAPTER_ACTIONS', payload: actionsArray })
  }

  useEffect(() => {
    if (!isBaseMapReady) {
      return
    }

    // Only initialise once
    if (datasetsInstanceRef.current) {
      return
    }

    const initDatasets = async () => {
      const adapter = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry, datasetRegistry)

      datasetsInstanceRef.current = initialiseDatasets({
        adapter,
        datasetRegistry,
        pluginConfig,
        pluginStateRef,
        mapStyle: mapState.mapStyle,
        mapProvider,
        events: EVENTS,
        dispatch,
        eventBus
      })
      // Each map has its own provider, so its API calls reach its own adapter
      mapProvider.datasets = adapter
      runQueuedActions(pluginStateRef.current.actionsArray)
    }

    initDatasets() // NOSONAR: Not changing for now as used in production
  }, [isBaseMapReady])

  useEffect(() => {
    datasetRegistry.attach(pluginState.mappedDatasets, pluginState.orderedDatasets)
    eventBus.emit('datasets:changed')
  },
  [pluginState.mappedDatasets, pluginState.orderedDatasets])

  useEffect(() => {
    datasetRegistry.attachMapStyle(mapState.mapStyle)
    const layerAdapter = mapProvider?.datasets
    if (layerAdapter?.onMapStyleChange) {
      // MapLibre's own map.addImage()/setPaintProperty() calls (made while re-registering
      // symbols/patterns below) naturally re-trigger MAP_DATA_CHANGE via the GL engine's own
      // styledata event — nothing extra needed there. OL has no such generic signal (its
      // MAP_DATA_CHANGE is tied only to the basemap tile source's own tileloadend — see
      // providers/openlayers/src/appEvents.js's comment), so re-registering a symbol on a
      // plain ol/layer/Vector never fires it. Emitting it explicitly once re-registration
      // genuinely finishes lets the interact plugin's settle-window re-apply (armed by
      // MAP_STYLE_CHANGE, see useHighlightSync.js) pick up the new theme's selected/active
      // symbol images, instead of a highlight staying stuck on whatever was cached moments
      // before the switch.
      Promise.resolve(layerAdapter.onMapStyleChange()).then(() => { // NOSONAR: Not changing for now as used in production
        eventBus.emit(EVENTS.MAP_DATA_CHANGE)
      })
    }
  },
  [mapState.mapStyle])

  useEffect(() => datasetRegistry.attachGlobals(pluginState.globals), [pluginState.globals])

  useEffect(() => runQueuedActions(pluginState.actionsArray), [pluginState.actionsArray])

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (datasetsInstanceRef.current) {
        datasetsInstanceRef.current.remove()
        datasetsInstanceRef.current = null
        mapProvider.datasets = null
      }
    }
  }, [])

  return null
}
