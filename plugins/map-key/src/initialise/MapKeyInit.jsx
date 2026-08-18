import { useEffect } from 'react'
import { createMapKey } from './createMapKey.js'

export function MapKeyInit ({ pluginConfig, pluginState, appState, mapState, mapProvider, services }) {
  useEffect(() => {
    if (!mapState.isMapReady) {
      return
    }
    const { remove } = createMapKey()
    return remove
  }, [mapState.isMapReady])
}
