import { useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { EVENTS as events } from '../../config/events.js'

/**
 * Keeps React state in sync with the map provider by listening to move,
 * move-end and first-idle events. On each move-end it also emits a
 * MAP_STATE_UPDATED event carrying both the previous and current state,
 * which other hooks (e.g. useMapAnnouncements) use to determine what changed.
 */
export function useMapStateSync () {
  const { mapProvider } = useConfig()
  const { dispatch } = useMap()
  const { eventBus } = useService()

  const previousState = useRef(null)
  const hasInitialized = useRef(false)

  useEffect(() => {
    if (!mapProvider) {
      return undefined
    }

    // Handle map move
    const handleMapMove = (payload) => {
      dispatch({
        type: 'MAP_MOVE',
        payload
      })
    }

    // Handle map moveend
    const handleMapMoveEnd = (payload) => {
      // Update React state
      dispatch({
        type: 'MAP_MOVE_END',
        payload
      })

      // Emit event with both previous and current state for other hooks
      eventBus.emit(events.MAP_STATE_UPDATED, {
        previous: previousState.current,
        current: payload
      })

      // Update previous state for next comparison
      previousState.current = payload
    }

    // Capture initial state when map is idle (first time only)
    const handleMapFirstIdle = (payload) => {
      if (!hasInitialized.current) {
        previousState.current = {
          center: mapProvider.getCenter(),
          zoom: mapProvider.getZoom()
        }
        hasInitialized.current = true
      }

      dispatch({
        type: 'MAP_FIRST_IDLE',
        payload
      })
    }

    // Listen to map events
    eventBus.on(events.MAP_MOVE, handleMapMove)
    eventBus.on(events.MAP_MOVE_END, handleMapMoveEnd)
    eventBus.on(events.MAP_FIRST_IDLE, handleMapFirstIdle)

    return () => {
      eventBus.off(events.MAP_MOVE, handleMapMove)
      eventBus.off(events.MAP_MOVE_END, handleMapMoveEnd)
      eventBus.off(events.MAP_FIRST_IDLE, handleMapFirstIdle)
    }
  }, [mapProvider, dispatch])
}
