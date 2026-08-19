import { useEffect } from 'react'
import { createMenu } from './createMenu.js'

// additional possible params here are: pluginConfig, pluginState, appState, mapProvider,
export function MenuInit ({ pluginConfig, pluginState, mapState, services }) {
  const { dispatch } = pluginState
  const { eventBus } = services

  useEffect(() => {
    if (!mapState.isMapReady) {
      return () => {}
    }
    const { menu } = pluginConfig
    const { remove } = createMenu({ menu, eventBus, dispatch })
    return remove
  }, [mapState.isMapReady])
}
