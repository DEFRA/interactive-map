// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { createDatasets } from './datasets.js'
import { datasetRegistry } from './registry/datasetRegistry.js'
import { attachGlobalState } from './registry/globalDataset.js'

const useLayerAdapterActions = (methodName, dispatch, pluginState, dependencies) =>
  useEffect(() => {
    const methodParameters = pluginState.layerAdapterActions?.[methodName] || []
    const method = pluginState.layerAdapter?.[methodName]
    if (method && methodParameters.length) {
      methodParameters.forEach((parameters) => {
        method.bind(pluginState.layerAdapter)(...parameters)
      })
      if (methodParameters.length) {
        dispatch({ type: 'SET_LAYER_ADAPTER_ACTIONS', payload: { [methodName]: [] } })
      }
    }
  }, [...dependencies])

export function DatasetsInit ({ pluginConfig, pluginState, appState, mapState, mapProvider, services }) {
  const { dispatch } = pluginState
  const { eventBus, symbolRegistry, patternRegistry } = services

  const isMapStyleReady = !!mapProvider.map?.getStyle()

  // Keep a ref to the latest pluginState so event handlers can access current data
  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  // Track initialisation and store cleanup function
  const datasetsInstanceRef = useRef(null)

  useEffect(() => {
    const inModeWhitelist = pluginConfig.includeModes?.includes(appState.mode) ?? true
    const inExcludeModes = pluginConfig.excludeModes?.includes(appState.mode) ?? false

    if (!isMapStyleReady || !inModeWhitelist || inExcludeModes) {
      return
    }

    // Only initialise once
    if (datasetsInstanceRef.current) {
      return
    }

    const initDatasets = async () => {
      if (!pluginConfig.layerAdapter) {
        throw new Error('datasets plugin: no layerAdapter provided. Import and pass maplibreLayerAdapter or a custom adapter.')
      }

      const { default: LayerAdapter } = await pluginConfig.layerAdapter.load()
      const adapter = new LayerAdapter(mapProvider, symbolRegistry, patternRegistry)

      dispatch({ type: 'SET_LAYER_ADAPTER', payload: adapter })

      datasetsInstanceRef.current = createDatasets({
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
  }, [isMapStyleReady, appState.mode])

  const datasetsRef = useRef(pluginState.mappedDatasets)
  const orderedDatasetsRef = useRef(pluginState.orderedDatasets)
  datasetsRef.current = pluginState.mappedDatasets
  orderedDatasetsRef.current = pluginState.orderedDatasets
  useEffect(() => {
    datasetRegistry.attach(datasetsRef.current, pluginState.orderedDatasets)
  }, [pluginState.mappedDatasets, pluginState.orderedDatasets])

  useEffect(() => {
    attachGlobalState(pluginState.globals)
  }, [pluginState.globals])

  useLayerAdapterActions('applyStyle', dispatch, pluginState, [pluginState.layerAdapterActions.applyStyle])
  useLayerAdapterActions('applyDatasetVisibility', dispatch, pluginState, [pluginState.layerAdapterActions.applyDatasetVisibility])
  useLayerAdapterActions('applyDatasetOpacity', dispatch, pluginState, [pluginState.layerAdapterActions.applyDatasetOpacity])
  useLayerAdapterActions('applyGlobalOpacity', dispatch, pluginState, [pluginState.layerAdapterActions.applyGlobalOpacity])
  useLayerAdapterActions('addDataset', dispatch, pluginState, [pluginState.layerAdapterActions.addDataset])
  useLayerAdapterActions('applyFeatureFilter', dispatch, pluginState, [pluginState.layerAdapterActions.applyFeatureFilter])

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      if (datasetsInstanceRef.current) {
        datasetsInstanceRef.current.remove()
        datasetsInstanceRef.current = null
      }
      dispatch({ type: 'SET_LAYER_ADAPTER', payload: null })
    }
  }, [])

  return null
}
