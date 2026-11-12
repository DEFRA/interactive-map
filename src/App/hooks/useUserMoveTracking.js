import { useEffect } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { EVENTS as events } from '../../config/events.js'

// How soon after the user's last input a map move still counts as theirs, covering the gap
// between a key press or wheel turn and the move it starts
export const USER_INPUT_WINDOW_MS = 500

const INPUT_EVENTS = ['wheel', 'keydown', 'keyup']

/**
 * Sets mapState.isUserMove on each move start: true when the user started the move with a mouse,
 * touch or the keyboard anywhere in the app (the map, or controls like the zoom buttons), false
 * when code moved the map.
 */
export function useUserMoveTracking () {
  const { mapProvider } = useConfig()
  const { layoutRefs } = useApp()
  const { dispatch } = useMap()
  const { eventBus } = useService()

  useEffect(() => {
    const container = layoutRefs.appContainerRef?.current
    if (!mapProvider || !container) {
      return undefined
    }

    let lastInputAt = -Infinity
    let isPointerDown = false

    const handleInput = () => {
      lastInputAt = Date.now()
    }
    const handlePointerDown = () => {
      isPointerDown = true
      handleInput()
    }
    // Listened for on the document, as the pointer can be released outside the app
    const handlePointerUp = () => {
      isPointerDown = false
    }
    // Starts false, as in mapState. Only sent when it changes: a resize starts several moves inside
    // MapLibre's ResizeObserver, and rendering for each one causes a ResizeObserver loop error.
    let lastIsUserMove = false
    const handleMoveStart = () => {
      const isUserMove = isPointerDown || Date.now() - lastInputAt <= USER_INPUT_WINDOW_MS
      if (isUserMove === lastIsUserMove) {
        return
      }
      lastIsUserMove = isUserMove
      dispatch({ type: 'MAP_MOVE_START', payload: { isUserMove } })
    }

    // Capture phase, so map libraries that stop propagation can't hide the input
    container.addEventListener('pointerdown', handlePointerDown, true)
    INPUT_EVENTS.forEach(type => container.addEventListener(type, handleInput, true))
    document.addEventListener('pointerup', handlePointerUp, true)
    document.addEventListener('pointercancel', handlePointerUp, true)
    eventBus.on(events.MAP_MOVE_START, handleMoveStart)

    return () => {
      container.removeEventListener('pointerdown', handlePointerDown, true)
      INPUT_EVENTS.forEach(type => container.removeEventListener(type, handleInput, true))
      document.removeEventListener('pointerup', handlePointerUp, true)
      document.removeEventListener('pointercancel', handlePointerUp, true)
      eventBus.off(events.MAP_MOVE_START, handleMoveStart)
    }
  }, [mapProvider, eventBus, dispatch])
}
