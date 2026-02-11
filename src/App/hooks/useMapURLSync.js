import { useEffect } from 'react'
import { setMapStateInURL } from '../../utils/mapStateSync.js'
import { useConfig } from '../store/configContext.js'
import { useService } from '../store/serviceContext.js'
import { EVENTS as events } from '../../config/events.js'

/**
 * Persists the current map center and zoom into the page URL whenever the
 * map state changes, allowing the view to be restored on page reload or
 * shared via a link.
 */
export function useMapURLSync () {
  const { id } = useConfig()
  const { eventBus } = useService()

  useEffect(() => {
    if (!id) {
      return undefined
    }

    const handleStateUpdate = ({ current }) => {
      setMapStateInURL(id, {
        center: current.center,
        zoom: current.zoom
      })
    }

    eventBus.on(events.MAP_STATE_UPDATED, handleStateUpdate)
    return () => eventBus.off(events.MAP_STATE_UPDATED, handleStateUpdate)
  }, [id])
}
