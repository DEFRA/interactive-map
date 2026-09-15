import { useEffect, useRef } from 'react'
import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'
import { attachPluginStateRef } from '../reducers/mergeKeyGroupItems.js'

// additional possible params here are: pluginConfig, appState, mapProvider,
export function MapKeyInit ({ pluginConfig, pluginState, mapState, services }) {
  const { dispatch } = pluginState
  const { eventBus } = services
  const pluginStateRef = useRef(pluginState)
  pluginStateRef.current = pluginState

  useEffect(() => {
    if (!mapState.isMapReady) {
      return
    }
    attachPluginStateRef(pluginStateRef)
    // Request a handle on the datasetsRegistry singleton
    eventBus.requestOnce('datasets:registry', setDatasetRegistry)
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
