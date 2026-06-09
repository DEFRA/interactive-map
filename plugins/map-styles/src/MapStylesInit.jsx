// src/plugins/mapStyles/MapStylesInit.jsx
import { useEffect } from 'react'
import { EVENTS } from '../../../../src/config/events.js'

export function MapStylesInit ({ pluginConfig, services }) {
  const { eventBus } = services

  const handler = () => {
    eventBus.emit(EVENTS.MAP_INIT_MAP_STYLES, pluginConfig.mapStyles)
  }

  useEffect(() => {
    eventBus.on(EVENTS.APP_READY, handler)

    return () => eventBus.off(EVENTS.APP_READY, handler)
  }, [])

  return <></> // no UI output, just side effects
}
