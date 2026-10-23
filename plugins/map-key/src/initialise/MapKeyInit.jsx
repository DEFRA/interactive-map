import { useEffect } from 'react'

// additional possible params here are: pluginConfig, appState, mapProvider,
export function MapKeyInit ({ pluginConfig, pluginState, mapState, services }) {
  const { dispatch } = pluginState
  const { eventBus } = services

  useEffect(() => {
    if (!mapState.isMapReady) {
      return
    }
    // Request this map's datasets registry, which arrives straight away if the datasets plugin is ready
    eventBus.requestOnce('datasets:registry', (datasetRegistry) => {
      dispatch({ type: 'SET_DATASET_REGISTRY', payload: datasetRegistry })
    })
    eventBus.emit('map-key:ready')
  }, [mapState.isMapReady])

  useEffect(() => {
    if (!pluginConfig.groups) {
      return
    }
    const groups = Object.entries(pluginConfig.groups).map(([id, group]) => ({ ...group, id, label: group.groupLabel }))

    dispatch({ type: 'ADD_KEY_GROUPS', payload: groups })
  }, [pluginConfig.groups])
}
