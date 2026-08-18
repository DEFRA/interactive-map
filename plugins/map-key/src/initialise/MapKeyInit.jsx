import { useEffect } from 'react'
import { createMapKey } from './createMapKey.js'

export function MapKeyInit ({ pluginConfig, pluginState, appState, mapState, mapProvider, services }) {
  const { eventBus } = services

  useEffect(() => {
    if (!mapState.isMapReady) {
      return
    }
    const { remove } = createMapKey({ eventBus })
    return remove
  }, [mapState.isMapReady])
}
