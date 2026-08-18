import { useEffect } from 'react'
import { createMapKey } from './createMapKey.js'

// additional possible params here are: pluginConfig, pluginState, appState, mapProvider,
export function MapKeyInit ({ mapState, services }) {
  const { eventBus } = services

  useEffect(() => {
    if (!mapState.isMapReady) {
      return () => {}
    }
    const { remove } = createMapKey({ eventBus })
    return remove
  }, [mapState.isMapReady])
}
