import { useEffect } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { EVENTS as events } from '../../config/events.js'
import { getMapStateFromURL } from '../../utils/mapStateSync.js'
import { isAtResetViewTarget } from '../../utils/resetView.js'

// How long after a reset the map has to start moving. If it doesn't, it was already at the reset view.
export const RESET_MOVE_WINDOW_MS = 1000

// Input on the map that can move it, so a reset move the user takes over isn't recorded
const MAP_INPUT_EVENTS = ['pointerdown', 'wheel', 'keydown']

const getStorageKey = (id) => `${id}:resetViewTarget`

// Session storage can be blocked, so a target that can't be saved or read is just not remembered
const saveTarget = (id, target) => {
  try {
    globalThis.sessionStorage.setItem(getStorageKey(id), JSON.stringify(target))
  } catch {
    // Not remembered
  }
}

const readTarget = (id) => {
  try {
    const target = JSON.parse(globalThis.sessionStorage.getItem(getStorageKey(id)))
    return Array.isArray(target?.center) && typeof target.zoom === 'number' ? target : null
  } catch {
    return null
  }
}

/**
 * Sets mapState.resetViewTarget to the center and zoom the map settles at when showing its
 * configured view: on load, and at the end of each reset. The reset view button is disabled
 * while the map is still there, and while the target isn't known: before the map first settles
 * and during a reset. It's null when the map loads somewhere else, or the user takes over a reset.
 *
 * The target is what the map reports, not the configured values, as fitting bounds gives a center
 * and zoom that depend on the map's size and safe zone. It's kept in session storage, so a page
 * reloaded at the reset view, with the view in the URL, starts with the button disabled.
 */
export function useResetViewTarget () {
  const { id, mapProvider, urlPosition = 'sync' } = useConfig()
  const { layoutRefs } = useApp()
  const { dispatch } = useMap()
  const { eventBus } = useService()

  useEffect(() => {
    const viewport = layoutRefs.viewportRef?.current
    if (!mapProvider || !viewport) {
      return undefined
    }

    const isInitialViewConfigured = urlPosition === 'none' || !getMapStateFromURL(id, globalThis.location.search)
    let pendingReset = null

    const dispatchTarget = (payload) => dispatch({ type: 'SET_RESET_VIEW_TARGET', payload })

    const setTarget = ({ center, zoom }) => {
      saveTarget(id, { center, zoom })
      dispatchTarget({ center, zoom })
    }

    const cancelPendingReset = () => {
      clearTimeout(pendingReset?.timer)
      pendingReset = null
    }

    // A view from the URL is only the reset view if it's where the last reset in this session went
    const handleFirstIdle = (state) => {
      if (!state) {
        return
      }
      if (isInitialViewConfigured) {
        setTarget(state)
        return
      }
      const savedTarget = readTarget(id)
      dispatchTarget(isAtResetViewTarget({ ...state, resetViewTarget: savedTarget }, mapProvider) ? savedTarget : null)
    }

    const handleResetView = () => {
      cancelPendingReset()
      const timer = setTimeout(() => {
        if (!pendingReset.hasMoved) {
          cancelPendingReset()
          setTarget({ center: mapProvider.getCenter(), zoom: mapProvider.getZoom() })
        }
      }, RESET_MOVE_WINDOW_MS)
      pendingReset = { timer, hasMoved: false }
      dispatch({ type: 'CLEAR_RESET_VIEW_TARGET' })
    }

    const handleMoveStart = () => {
      if (pendingReset) {
        pendingReset.hasMoved = true
      }
    }

    // Move end is debounced by the providers, so it fires once after the safe zone padding and the reset move
    const handleMoveEnd = (state) => {
      if (pendingReset?.hasMoved && state) {
        cancelPendingReset()
        setTarget(state)
      }
    }

    // The press of the reset button itself comes before the reset, so doesn't cancel it
    const handleMapInput = () => {
      if (pendingReset) {
        cancelPendingReset()
        dispatchTarget(null)
      }
    }

    eventBus.on(events.MAP_FIRST_IDLE, handleFirstIdle)
    eventBus.on(events.MAP_RESET_VIEW, handleResetView)
    eventBus.on(events.MAP_MOVE_START, handleMoveStart)
    eventBus.on(events.MAP_MOVE_END, handleMoveEnd)
    MAP_INPUT_EVENTS.forEach(type => viewport.addEventListener(type, handleMapInput, true))

    return () => {
      cancelPendingReset()
      eventBus.off(events.MAP_FIRST_IDLE, handleFirstIdle)
      eventBus.off(events.MAP_RESET_VIEW, handleResetView)
      eventBus.off(events.MAP_MOVE_START, handleMoveStart)
      eventBus.off(events.MAP_MOVE_END, handleMoveEnd)
      MAP_INPUT_EVENTS.forEach(type => viewport.removeEventListener(type, handleMapInput, true))
    }
  }, [mapProvider, eventBus, dispatch])
}
