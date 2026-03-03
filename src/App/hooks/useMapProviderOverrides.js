import { useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useApp } from '../store/appContext.js'
import { useMap } from '../store/mapContext.js'
import { EVENTS as events } from '../../config/events.js'
import { getSafeZoneInset } from '../../utils/getSafeZoneInset.js'
import { scalePoints } from '../../utils/scalePoints.js'
import { scaleFactor } from '../../config/appConfig.js'

export const useMapProviderOverrides = () => {
  const { mapProvider, eventBus } = useConfig()
  const { dispatch: appDispatch, layoutRefs } = useApp()
  const { mapSize } = useMap()

  const latestMapSize = useRef(mapSize)
  latestMapSize.current = mapSize

  const updatePadding = () => {
    const safeZoneInset = getSafeZoneInset(layoutRefs)
    const padding = scalePoints(safeZoneInset, scaleFactor[latestMapSize.current])

    if (typeof appDispatch === 'function') {
      appDispatch({
        type: 'SET_SAFE_ZONE_INSET',
        payload: { safeZoneInset, syncMapPadding: false }
      })
    }

    if (typeof mapProvider.setPadding === 'function') {
      mapProvider.setPadding(padding)
    }
  }

  useEffect(() => {
    if (!mapProvider) {
      return undefined
    }

    const originalFitToBounds = mapProvider.fitToBounds

    mapProvider.fitToBounds = (bounds, skipPaddingCalc = false) => {
      if (!bounds) {
        return undefined
      }

      // Calculate and set safe zone padding unless explicitly skipped
      if (!skipPaddingCalc) {
        updatePadding()
      }

      return originalFitToBounds.call(mapProvider, bounds)
    }

    const originalSetView = mapProvider.setView

    mapProvider.setView = ({ center, zoom }) => {
      if (!center) {
        return undefined
      }

      updatePadding()

      return originalSetView.call(mapProvider, { center, zoom })
    }

    return () => {
      mapProvider.fitToBounds = originalFitToBounds
      mapProvider.setView = originalSetView
    }
  }, [mapProvider, appDispatch, layoutRefs, mapSize])

  // Forward public API events to the (overridden) mapProvider methods so that
  // interactiveMap.fitToBounds() and interactiveMap.setView() respect safe zone padding.
  useEffect(() => {
    if (!mapProvider || !eventBus) return undefined

    const handleFitToBounds = (bbox) => mapProvider.fitToBounds(bbox)
    const handleSetView = (opts) => mapProvider.setView(opts)

    eventBus.on(events.MAP_FIT_TO_BOUNDS, handleFitToBounds)
    eventBus.on(events.MAP_SET_VIEW, handleSetView)

    return () => {
      eventBus.off(events.MAP_FIT_TO_BOUNDS, handleFitToBounds)
      eventBus.off(events.MAP_SET_VIEW, handleSetView)
    }
  }, [mapProvider, eventBus])
}
