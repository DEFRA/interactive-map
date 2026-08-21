import { useEffect } from 'react'
import { setDatasetRegistry } from '../registry/getDatasetRegistry.js'

// additional possible params here are: pluginConfig, pluginState, appState, mapProvider,
export function MapKeyInit ({ mapState, services }) {
  const { eventBus } = services

  useEffect(() => {
    if (!mapState.isMapReady) {
      return
    }
    // Request a handle on the datasetsRegistry singleton
    eventBus.requestOnce('datasets:registry', setDatasetRegistry)
  }, [mapState.isMapReady])
}
