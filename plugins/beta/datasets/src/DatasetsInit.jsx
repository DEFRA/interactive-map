// src/plugins/datasets/datasetsInit.jsx
import { useEffect, useRef } from 'react'
import { datasetDefaults } from './defaults.js'
import { createDatasets } from './datasets.js'

export function DatasetsInit ({ pluginConfig, pluginState, appState, mapState, mapProvider, services }) {
  const { dispatch } = pluginState
  const { events, eventBus } = services

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
      dispatch({ type: 'SET_DATASETS', payload: { datasets: pluginConfig.datasets, datasetDefaults }})
    }

    datasetsInstanceRef.current = createDatasets({
      mapStyleId: mapState.mapStyle.id,
      pluginConfig,
      pluginStateRef,
      mapProvider,
      events,
      eventBus
    })
  }, [isMapStyleReady, appState.mode])

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
