import { useEffect, useRef } from 'react'
import { useConfig } from '../../store/configContext'
import { useApp } from '../../store/appContext'
import { useMap } from '../../store/mapContext'
import { useMapStateSync } from '../../hooks/useMapStateSync'
import { useMapURLSync } from '../../hooks/useMapURLSync'
import { useMapAnnouncements } from '../../hooks/useMapAnnouncements'
import { useMapProviderOverrides } from '../../hooks/useMapProviderOverrides'
import { getInitialMapState } from '../../../utils/mapStateSync'
import { scaleFactor } from '../../../config/appConfig'
import { scalePoints } from '../../../utils/scalePoints.js'

// eslint-disable-next-line camelcase, react/jsx-pascal-case
// sonarjs/disable-next-line function-name
export const MapController = ({ mapContainerRef }) => {
  const config = useConfig()
  const { id, mapProvider } = config
  const { safeZoneInset, breakpoint, isLayoutReady, syncMapPadding } = useApp()
  const { isMapReady, mapStyle, mapSize, center, zoom, bounds } = useMap()

  const isMapInitialized = useRef(false)

  // Determine initial map state based on URL, bounds, or center/zoom
  const initialState = getInitialMapState({ id, center, zoom, bounds })

  // Initialize map provider when props are available
  useEffect(() => {
    if (!safeZoneInset || !isLayoutReady || !mapStyle || !mapSize || isMapInitialized.current) {
      return undefined
    }

    requestAnimationFrame(() => {
      mapProvider.initMap({
        ...config,
        pixelRatio: window.devicePixelRatio * scaleFactor[mapSize],
        container: mapContainerRef.current,
        padding: safeZoneInset,
        center: initialState.center,
        zoom: initialState.zoom,
        bounds: initialState.bounds,
        mapStyle
      })
    })

    isMapInitialized.current = true

    return () => {
      // remove event listeners
    }
  }, [safeZoneInset, isLayoutReady, mapStyle, mapSize])

  // Sync React state, handle URL persistence and announce to screen reader
  useMapStateSync()
  useMapURLSync()
  useMapAnnouncements()

  // Override mapProvider functions
  useMapProviderOverrides()

  // Update padding when breakpoint or mapSize change
  useEffect(() => {
    if (!isMapReady || !syncMapPadding) {
      return undefined
    }
    mapProvider.setPadding(scalePoints(safeZoneInset, scaleFactor[mapSize]))
  }, [isMapReady, mapSize, breakpoint, safeZoneInset])

  return null
}
