import { useCallback, useEffect } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { scaleFactor } from '../../config/appConfig.js'
import { EVENTS as events } from '../../config/events.js'

export const useCrossHair = () => {
  const { mapProvider } = useConfig()
  const { safeZoneInset } = useApp()
  const { eventBus } = useService()
  const { crossHair, dispatch, mapSize } = useMap()

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
      return
    }

    // --- API ---

    crossHair.pinToMap = (coords, state) => {
      const { x, y } = mapProvider.mapToScreen(coords)
      crossHair.coords = coords
      dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isPinnedToMap: true, isVisible: true, coords, state } })
      updatePosition(el, x, y)
    }

    crossHair.fixAtCenter = () => {
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
      el.style.display = 'block'
      dispatch({ type: 'UPDATE_CROSS_HAIR', payload: { isVisible: true } })
    }

    crossHair.hide = () => {
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

  return {
    crossHair,
    crossHairRef
  }
}
