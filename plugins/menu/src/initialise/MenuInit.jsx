import { useEffect } from 'react'
import { createMenu } from './createMenu.js'

// additional possible params here are: pluginConfig, pluginState, appState, mapProvider,
export function MenuInit ({ mapState, services }) {
  const { eventBus } = services

  useEffect(() => {
    if (!mapState.isMapReady) {
      return () => {}
    }
    const { remove } = createMenu({ eventBus })
    return remove
  }, [mapState.isMapReady])
}
