// src/plugins/map-loading/MapLoadingInit.jsx
import { useEffect } from 'react'
import { EVENTS } from '../../../src/config/events.js'

export function MapLoadingInit ({ pluginConfig, services }) {
  const { eventBus } = services
  const controller = pluginConfig.controller

  useEffect(() => {
    if (!controller) {
      return undefined
    }

    // map:ready only fires for a freshly created map, so show() is a no-op for
    // the initial overlay and a re-show for a map reloaded after removeApp()
    const onReady = () => controller.show()
    const onFirstIdle = () => controller.dismiss('firstidle')
    const onDestroy = () => controller.dismiss('destroy')
    // a re-opened preserved map is already loaded - drop the overlay straight away
    const onOpened = ({ statePreserved } = {}) => {
      if (statePreserved) {
        controller.dismiss('appopened')
      }
    }

    eventBus.on(EVENTS.MAP_READY, onReady)
    eventBus.on(EVENTS.MAP_DESTROY, onDestroy)
    eventBus.on(EVENTS.APP_OPENED, onOpened)
    if (pluginConfig.dismissOnFirstIdle !== false) {
      eventBus.on(EVENTS.MAP_FIRST_IDLE, onFirstIdle)
    }

    return () => {
      eventBus.off(EVENTS.MAP_READY, onReady)
      eventBus.off(EVENTS.MAP_DESTROY, onDestroy)
      eventBus.off(EVENTS.APP_OPENED, onOpened)
      eventBus.off(EVENTS.MAP_FIRST_IDLE, onFirstIdle)
    }
  }, [])

  return <></> // no UI output, just side effects
}
