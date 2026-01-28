// src/plugins/useLocation/UseLocationInit.jsx
import { useEffect } from 'react'
import { attachEvents } from './events.js'

export function UseLocationInit ({ appConfig, appState, pluginState, mapState, mapProvider, buttonConfig }) {
  const { useLocation: useLocationButton } = buttonConfig

  // Attach events when component mounts
  useEffect(() => {
    if (!mapState.isMapReady) {
      return
    }

    attachEvents({
      appState,
      pluginState,
      mapProvider,
      useLocationButton
    })

    return () => {
      useLocationButton.onClick = null
    }
  }, [mapState.isMapReady])

  return null
}
