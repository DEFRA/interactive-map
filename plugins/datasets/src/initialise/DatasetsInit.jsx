// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { attachGlobalState } from '../registry/globalDataset.js'
import { loadLayerAdapter, layerAdapter } from '../adapters/loadLayerAdapter.js'
import { hasLayersMenu } from '../utils/hasLayersMenu.js'

export function DatasetsInit ({ pluginConfig, pluginState, mapState, mapProvider, services }) {
  const { dispatch } = pluginState
  const { eventBus, symbolRegistry, patternRegistry, focusMap } = services
  const isBaseMapReady = Boolean(mapProvider?.isBaseMapReady())
  const hasMenu = hasLayersMenu({ pluginConfig, pluginState })
  const isPanelOpenRef = useRef(false)

  useEffect(() => {
    let focusFrame
    const closeEmptyPanel = () => {
      if (hasMenu || !isPanelOpenRef.current) return
      isPanelOpenRef.current = false
      eventBus.emit(EVENTS.APP_HIDE_PANEL, 'datasetsLayers')
      // Let the panel close and release modal focus/inert behaviour first.
      focusFrame = requestAnimationFrame(() => focusMap())
    }
    const handleOpened = ({ panelId }) => {
      if (panelId !== 'datasetsLayers') return
      isPanelOpenRef.current = true
      closeEmptyPanel()
    }
    const handleClosed = ({ panelId }) => {
      if (panelId === 'datasetsLayers') isPanelOpenRef.current = false
    }
    eventBus.on(EVENTS.APP_PANEL_OPENED, handleOpened)
    eventBus.on(EVENTS.APP_PANEL_CLOSED, handleClosed)
    closeEmptyPanel()

    return () => {
      eventBus.off(EVENTS.APP_PANEL_OPENED, handleOpened)
      eventBus.off(EVENTS.APP_PANEL_CLOSED, handleClosed)
      cancelAnimationFrame(focusFrame)
    }
  }, [hasMenu, eventBus, focusMap])

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
      const adapter = await loadLayerAdapter(mapProvider, symbolRegistry, patternRegistry)

      datasetsInstanceRef.current = initialiseDatasets({
        adapter,
        pluginConfig,
        pluginStateRef,
        mapStyle: mapState.mapStyle,
        mapProvider,
        events: EVENTS,
        dispatch,
        eventBus
      })
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
    if (layerAdapter?.onMapStyleChange) {
      // MapLibre's own map.addImage()/setPaintProperty() calls (made while re-registering
      // symbols/patterns below) naturally re-trigger MAP_DATA_CHANGE via the GL engine's own
      // styledata event — nothing extra needed there. OL has no such generic signal (its
      // MAP_DATA_CHANGE is tied only to the basemap tile source's own tileloadend — see
      // providers/beta/openlayers/src/appEvents.js's comment), so re-registering a symbol on a
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

  useEffect(() => attachGlobalState(pluginState.globals), [pluginState.globals])

  // Call layerAdapter methods that are queued from state updates
  useEffect(() => {
    const { actionsArray } = pluginState
    if (!actionsArray.length) { return }
    actionsArray.forEach(({ method, parameters }) => layerAdapter[method](...parameters))
    dispatch({ type: 'REMOVE_ADAPTER_ACTIONS', payload: actionsArray })
  }, [pluginState.actionsArray])

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
