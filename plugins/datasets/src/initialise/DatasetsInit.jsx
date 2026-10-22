// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef, useState } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { createDatasetRegistry } from '../registry/datasetRegistry.js'
import { loadLayerAdapter } from '../adapters/loadLayerAdapter.js'
import { hasLayersMenu } from '../utils/hasLayersMenu.js'
import { getPanelElementId } from '../../../../src/utils/getPanelElementId.js'

const LAYERS_PANEL_ID = 'datasetsLayers'

export function DatasetsInit ({ appConfig, appState, pluginConfig, pluginState, mapState, mapProvider, services }) {
  const { dispatch } = pluginState
  const { eventBus, symbolRegistry, patternRegistry, focusMap } = services
  const isBaseMapReady = Boolean(mapProvider?.isBaseMapReady())
  const hasMenu = hasLayersMenu({ pluginConfig, pluginState })
  const isLayersPanelOpen = Boolean(appState.openPanels[LAYERS_PANEL_ID])
  const focusFrameRef = useRef(null)

  // One registry and layer adapter per plugin instance, so several maps can share a page
  const [datasetRegistry] = useState(createDatasetRegistry)
  const layerAdapterRef = useRef(null)

  // Make the registry available to the API and the layers menu
  useEffect(() => {
    dispatch({ type: 'SET_DATASET_REGISTRY', payload: datasetRegistry })
  }, [])

  // Close the Layers panel if its menu empties while it's open
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

  // Keep a ref to the latest pluginState so event handlers can access current data
  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  // Track initialisation and store cleanup function
  const datasetsInstanceRef = useRef(null)

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
      layerAdapterRef.current = adapter

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
      dispatch({ type: 'SET_LAYER_ADAPTER', payload: adapter })
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
    const layerAdapter = layerAdapterRef.current
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

  // Call layerAdapter methods that are queued from state updates, once the adapter has loaded
  useEffect(() => {
    const { actionsArray } = pluginState
    const layerAdapter = layerAdapterRef.current
    if (!actionsArray.length || !layerAdapter) { return }
    actionsArray.forEach(({ method, parameters }) => layerAdapter[method](...parameters))
    dispatch({ type: 'REMOVE_ADAPTER_ACTIONS', payload: actionsArray })
  }, [pluginState.actionsArray, pluginState.layerAdapter])

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (datasetsInstanceRef.current) {
        datasetsInstanceRef.current.remove()
        datasetsInstanceRef.current = null
      }
    }
  }, [])

  return null
}
