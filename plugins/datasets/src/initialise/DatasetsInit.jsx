// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { initialiseDatasets } from './initialiseDatasets.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { setMenuState } from '../registry/isVisibleWhen.js'
import { attachGlobalState } from '../registry/globalDataset.js'
import { loadLayerAdapter, layerAdapter } from '../adapters/loadLayerAdapter.js'

export function DatasetsInit ({ pluginConfig, pluginState, appState, mapState, mapProvider, services }) {
  const { dispatch } = pluginState
  const { eventBus, symbolRegistry, patternRegistry } = services
  const isBaseMapReady = Boolean(mapProvider?.isBaseMapReady())

  // Keep a ref to the latest pluginState so event handlers can access current data
  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  // Track initialisation and store cleanup function
  const datasetsInstanceRef = useRef(null)

  useEffect(() => {
    const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
    const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false

    if (!isBaseMapReady || !inModeWhitelist || inExcludeModes) {
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

    initDatasets()
  }, [isBaseMapReady, appState.mode])

  useEffect(() => {
    setMenuState(pluginState.menuState)
    datasetRegistry.invalidateKeyItems()
  }, [pluginState.menuState])

  useEffect(() => datasetRegistry.attach(pluginState.mappedDatasets, pluginState.orderedDatasets),
    [pluginState.mappedDatasets, pluginState.orderedDatasets])

  useEffect(() => {
    datasetRegistry.attachMapStyle(mapState.mapStyle)
    if (layerAdapter?.onMapStyleChange) {
      layerAdapter.onMapStyleChange()
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
