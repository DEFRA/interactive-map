// src/plugins/mapStyles/MapStylesInit.jsx
import { useEffect } from 'react'

export function MapStylesInit ({ pluginConfig, services }) {
  const { events, eventBus } = services

  const handler = () => {
    eventBus.emit(events.MAP_INIT_MAP_STYLES, pluginConfig.mapStyles)
  }

  useEffect(() => {
    eventBus.on(events.APP_READY, handler)

    return () => eventBus.off(events.APP_READY, handler)
  }, [])

  return <></> // no UI output, just side effects
}
