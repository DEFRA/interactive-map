import { useCallback, useEffect, useRef } from 'react'
import { useConfig } from '../store/configContext.js'
import { useMap } from '../store/mapContext.js'
import { useService } from '../store/serviceContext.js'
import { scaleFactor } from '../../config/appConfig.js'
import { EVENTS as events } from '../../config/events.js'

// Vertical offset to align the marker tip with the coordinate point
const MARKER_ANCHOR_OFFSET_Y = 19

/**
 * Projects geographic coordinates to screen pixel position, scaled for the
 * current map size and offset so the marker tip aligns with the point.
 *
 * @param {Array<number>} coords - [lng, lat] geographic coordinates
 * @param {Object} mapProvider - Map provider instance with `mapToScreen` method
 * @param {string} mapSize - Current map size key (e.g. 'small', 'medium', 'large')
 * @param {boolean} isMapReady - Whether the map has finished initialising
 * @returns {{ x: number, y: number }} Screen position in pixels
 */
export const projectCoords = (coords, mapProvider, mapSize, isMapReady) => {
  if (!mapProvider || !isMapReady) {
    return { x: 0, y: 0 }
  }
  const { x, y } = mapProvider.mapToScreen(coords)
  return {
    x: x * scaleFactor[mapSize],
    y: y * scaleFactor[mapSize] - MARKER_ANCHOR_OFFSET_Y
  }
}

/**
 * Reprojects and repositions all marker DOM elements to their current screen
 * coordinates. Called on map render and resize events.
 *
 * @param {Array<Object>} items - Marker state items from the store
 * @param {Map<string, HTMLElement>} markerRefs - Map of marker id to DOM element
 * @param {Object} mapProvider - Map provider instance
 * @param {string} mapSize - Current map size key
 * @param {boolean} isMapReady - Whether the map has finished initialising
 */
const updateMarkerPositions = (items, markerRefs, mapProvider, mapSize, isMapReady) => {
  items.forEach(marker => {
    const ref = markerRefs.get(marker.id)
    if (!ref || !marker.coords) {
      return
    }

    const { x, y } = projectCoords(marker.coords, mapProvider, mapSize, isMapReady)
    ref.style.transform = `translate(${x}px, ${y}px)`
    ref.style.display = 'block'
  })
}

/**
 * Registers event bus listeners for adding and removing markers via
 * APP_ADD_MARKER and APP_REMOVE_MARKER events.
 *
 * @param {Object} eventBus - Application event bus
 * @param {Object} markers - Markers API object with `add` and `remove` methods
 */
const useMarkerEventListeners = (eventBus, markers) => {
  useEffect(() => {
    const handleAddMarker = (payload = {}) => {
      if (!payload?.id || !payload?.coords) {
        return
      }
      const { id, coords, options } = payload
      markers.add(id, coords, options)
    }
    eventBus.on(events.APP_ADD_MARKER, handleAddMarker)

    const handleRemoveMarker = (id) => {
      if (!id) {
        return
      }
      markers.remove(id)
    }
    eventBus.on(events.APP_REMOVE_MARKER, handleRemoveMarker)

    return () => {
      eventBus.off(events.APP_ADD_MARKER, handleAddMarker)
      eventBus.off(events.APP_REMOVE_MARKER, handleRemoveMarker)
    }
  }, [])
}

/**
 * Hook that provides the markers API and ref callback for positioning marker
 * elements on the map. Attaches `add`, `remove`, and `getMarker` methods to the
 * markers store object and keeps marker positions in sync with map render and
 * resize events.
 *
 * @returns {{ markers: Object, markerRef: Function }}
 */
export const useMarkers = () => {
  const { mapProvider } = useConfig()
  const { eventBus } = useService()
  const { markers, dispatch, mapSize, isMapReady } = useMap()
  const markerRefs = useRef(new Map())

  // Attach add, remove, and getMarker methods to the markers store object
  useEffect(() => {
    if (!mapProvider) {
      return
    }

    markers.markerRefs = markerRefs.current

    markers.add = (id, coords, options) => {
      const { x, y } = projectCoords(coords, mapProvider, mapSize, isMapReady)
      dispatch({ type: 'UPSERT_LOCATION_MARKER', payload: { id, coords, ...options, x, y, isVisible: true } })
    }

    markers.remove = (id) => {
      dispatch({ type: 'REMOVE_LOCATION_MARKER', payload: id })
    }

    markers.getMarker = (id) => {
      return markers.items.find(marker => marker.id === id)
    }
  }, [mapProvider, markers, dispatch, mapSize])

  // Ref callback: stores marker DOM refs and subscribes to MAP_RENDER for repositioning
  const markerRef = useCallback((id) => (el) => {
    if (!el) {
      markerRefs.current.delete(id)
      return undefined
    }
    markerRefs.current.set(id, el)

    const updateMarkers = () => {
      if (!isMapReady || !mapProvider) {
        return
      }
      updateMarkerPositions(markers.items, markerRefs.current, mapProvider, mapSize, isMapReady)
    }
    eventBus.on(events.MAP_RENDER, updateMarkers)

    return () => {
      eventBus.off(events.MAP_RENDER, updateMarkers)
    }
  }, [markers, mapProvider, isMapReady, mapSize])

  // Reproject all markers when the map size changes
  useEffect(() => {
    if (!isMapReady || !mapProvider) {
      return
    }

    updateMarkerPositions(markers.items, markerRefs.current, mapProvider, mapSize, isMapReady)
  }, [mapSize, markers.items, mapProvider, isMapReady])

  useMarkerEventListeners(eventBus, markers)

  return { markers, markerRef }
}
