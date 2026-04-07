// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { datasetDefaults } from './defaults.js'
import { createDatasets } from './datasets.js'

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

    // Only initialise state if not already set
    if (!pluginState.datasets) {
      dispatch({ type: 'SET_DATASETS', payload: { datasets: pluginConfig.datasets, datasetDefaults } })
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
        eventBus
      })
    }

    initDatasets()
  }, [isMapStyleReady, appState.mode])

  useEffect(() => {
    dispatch({ type: 'SET_KEY_GROUPS', payload: null })
  }, [pluginState.datasets])
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
