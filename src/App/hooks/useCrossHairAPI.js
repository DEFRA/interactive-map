import { useCallback, useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { scaleFactor } from '../../config/appConfig.js'
import { EVENTS as events } from '../../config/events.js'

// crossHairHideHeldByMapControls is shared by every copy of the crossHair object, because each
// UPDATE_CROSS_HAIR replaces the object and a plugin can still call an older copy
const assignCrossHairAPI = (crossHair, el, mapProvider, dispatch, updatePosition, crossHairHideHeldByMapControls) => {
  crossHair.pinToMap = (coords, state) => {
    const { x, y } = mapProvider.mapToScreen(coords)
    crossHairHideHeldByMapControls.isHideWaiting = false
    crossHair.coords = coords
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: true, isVisible: true, coords, state } })
    updatePosition(el, x, y)
  }

  crossHair.fixAtCenter = () => {
    crossHairHideHeldByMapControls.isHideWaiting = false
    el.style.left = '50%'
    el.style.top = '50%'
    el.style.transform = 'translate(0,0)'
    el.style.display = 'block'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: false, isVisible: true } })
  }

  crossHair.remove = () => {
    el.style.display = 'none'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: false, isVisible: false } })
  }

  crossHair.show = () => {
    crossHairHideHeldByMapControls.isHideWaiting = false
    el.style.display = 'block'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: true } })
  }

  // Hides the crosshair completely, so screen readers and Voice Control don't find a "Target"
  // that isn't there. While the map controls are open the crosshair stays visible, because the
  // user has asked for it. A hide asked for then is held back until the controls close, unless
  // something shows the crosshair again first.
  crossHair.hide = () => {
    if (crossHairHideHeldByMapControls.isMapControlsOpen) {
      crossHairHideHeldByMapControls.isHideWaiting = true
      return
    }
    crossHairHideHeldByMapControls.isHideWaiting = false
    el.style.display = 'none'
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: false } })
  }

  crossHair.setStyle = (state) => {
    dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { state } })
  }

  crossHair.getDetail = () => {
    const coords = crossHair.isPinnedToMap ? crossHair.coords : mapProvider.getCenter()

    return {
      state: crossHair.state,
      point: mapProvider.mapToScreen(coords),
      zoom: mapProvider.getZoom(),
      coords
    }
  }
}

export const useCrossHair = () => {
  const { mapProvider } = useConfig()
  const { safeZoneInset, expandedButtons } = useApp()
  const { eventBus } = useService()
  const { crossHair, dispatch, mapSize } = useMap()
  const crossHairHideHeldByMapControlsRef = useRef({ isMapControlsOpen: false, isHideWaiting: false })

  const updatePosition = (el, x, y) => {
    if (!safeZoneInset) {
      return
    }
    const scaled = { x: x * scaleFactor[mapSize], y: y * scaleFactor[mapSize] }
    el.style.transform = `translate(${scaled.x - safeZoneInset.left}px, ${scaled.y - safeZoneInset.top}px)`
    el.style.left = '0'
    el.style.top = '0'
    el.style.display = 'block'
  }

  const crossHairRef = useCallback(el => {
    if (!el) {
      return undefined
    }

    assignCrossHairAPI(crossHair, el, mapProvider, dispatch, updatePosition, crossHairHideHeldByMapControlsRef.current)

    const handleRender = () => {
      if (crossHair.coords && crossHair.isPinnedToMap) {
        const { x, y } = mapProvider.mapToScreen(crossHair.coords)
        updatePosition(el, x, y)
      }
    }

    eventBus.on(events.MAP_RENDER, handleRender)

    return () => {
      eventBus.off(events.MAP_RENDER, handleRender)
    }
  }, [crossHair, mapProvider, mapSize, dispatch, safeZoneInset])

  useEffect(() => {
    if (crossHair.coords && crossHair.isPinnedToMap) {
      // Call again on size change
      crossHair.pinToMap(crossHair.coords, crossHair.state)
    }
  }, [mapSize])

  // Tells hide() whether the map controls are open. It's set while rendering so it's up to date
  // as soon as possible, but a plugin can still call hide() before this component re-renders. So
  // when the controls close, carry out any hide that was held back.
  const isMapControlsOpen = !!expandedButtons?.has('mapControls')
  crossHairHideHeldByMapControlsRef.current.isMapControlsOpen = isMapControlsOpen

  useEffect(() => {
    if (!isMapControlsOpen && crossHairHideHeldByMapControlsRef.current.isHideWaiting) {
      crossHair.hide()
    }
  }, [isMapControlsOpen])

  return {
    crossHair,
    crossHairRef
  }
}
