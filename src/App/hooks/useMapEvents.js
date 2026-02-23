import { useEffect } from 'react'
import { useConfig } from '../store/configContext.js'
import { useService } from '../store/serviceContext.js'

/**
 * Subscribes to map events via the shared event bus for the lifetime of
 * the consuming component. Handlers are automatically unsubscribed on
 * unmount or when the eventMap reference changes.
 *
 * Supported events include clicks, pans, zooms, style changes and more
 * — see `EVENTS` in `config/events.js` for the full list.
 *
 * @param {Object<string, Function>} [eventMap={}] - A map of event names to
 *   callback functions.
 */
export function useMapEvents (eventMap = {}) {
  const { mapProvider } = useConfig()
  const { eventBus } = useService()

  useEffect(() => {
    if (!mapProvider) {
      return undefined
    }

    const handlers = {}

    Object.entries(eventMap).forEach(([eventName, callback]) => {
      const handler = (event) => callback(event)
      handlers[eventName] = handler
      eventBus.on(eventName, handler)
    })

    return () => {
      Object.entries(handlers).forEach(([eventName, handler]) => {
        eventBus.off(eventName, handler)
      })
    }
  }, [mapProvider, eventMap])
}
