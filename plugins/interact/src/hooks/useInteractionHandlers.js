import { useCallback, useEffect, useRef } from 'react'
import { isContiguousWithAny, canSplitFeatures, areAllContiguous } from '../utils/spatial.js'
import { getFeaturesAtPoint, findMatchingFeature, buildLayerConfigMap } from '../utils/featureQueries.js'

/**
 * Returns the id of the first DOM marker whose visual bounds contain the given point.
 *
 * MAP_CLICK point is container-relative; getBoundingClientRect is viewport-relative.
 * We convert by subtracting the parent element's top-left (markers share a parent with
 * the map container, so parentElement.getBoundingClientRect() gives the offset).
 *
 * @param {Object} markers - markers object from mapState (has .items and .markerRefs)
 * @param {{ x: number, y: number }} point - container-relative pixel coordinates
 * @returns {string|null}
 */
const findMarkerAtPoint = (markers, point) => {
  for (const marker of markers.items) {
    const el = markers.markerRefs?.get(marker.id)
    if (!el) {
      continue
    }
    const parent = el.parentElement
    const parentRect = parent ? parent.getBoundingClientRect() : { left: 0, top: 0 }
    const { left, top, right, bottom } = el.getBoundingClientRect()
    if (
      point.x >= left - parentRect.left && point.x <= right - parentRect.left &&
      point.y >= top - parentRect.top && point.y <= bottom - parentRect.top
    ) {
      return marker.id
    }
  }
  return null
}

const useSelectionChangeEmitter = (eventBus, selectedFeatures, selectedMarkers, selectionBounds) => {
  const lastEmittedSelectionChange = useRef(null)

  useEffect(() => {
    // Skip if features exist but bounds not yet calculated
    const awaitingBounds = selectedFeatures.length > 0 && !selectionBounds
    if (awaitingBounds) {
      return
    }

    // Skip if selection was already empty and remains empty
    const prev = lastEmittedSelectionChange.current
    const wasEmpty = prev === null || (prev.features.length === 0 && prev.markers.length === 0)
    if (wasEmpty && selectedFeatures.length === 0 && selectedMarkers.length === 0) {
      return
    }

    eventBus.emit('interact:selectionchange', {
      selectedFeatures,
      selectedMarkers,
      selectionBounds,
      canMerge: areAllContiguous(selectedFeatures),
      canSplit: canSplitFeatures(selectedFeatures)
    })

    lastEmittedSelectionChange.current = { features: selectedFeatures, markers: selectedMarkers }
  }, [selectedFeatures, selectedMarkers, selectionBounds])
}

export const useInteractionHandlers = ({
  mapState,
  pluginState,
  services,
  mapProvider
}) => {
  const { markers } = mapState
  const { dispatch, dataLayers, interactionMode, multiSelect, contiguous, marker: markerOptions, tolerance, selectedFeatures, selectedMarkers, selectionBounds, deselectOnClickOutside } = pluginState
  const { eventBus } = services
  const layerConfigMap = buildLayerConfigMap(dataLayers)

  const processFeatureMatch = useCallback(({ feature, config }) => {
    markers.remove('location')
    const isNewContiguous = contiguous && isContiguousWithAny(feature, selectedFeatures)
    const featureId = feature.properties?.[config.idProperty] ?? feature.id
    if (featureId == null) {
      return
    }
    dispatch({
      type: 'TOGGLE_SELECTED_FEATURES',
      payload: {
        featureId,
        multiSelect,
        layerId: config.layerId,
        idProperty: config.idProperty,
        properties: feature.properties,
        geometry: feature.geometry,
        replaceAll: contiguous && !isNewContiguous
      }
    })
  }, [markers, contiguous, selectedFeatures, dispatch, multiSelect])

  const processFallback = useCallback(({ coords, hasDataLayers }) => {
    const isMarkerMode = interactionMode === 'marker' || (interactionMode === 'auto' && hasDataLayers)
    if (!isMarkerMode && !deselectOnClickOutside) {
      return
    }
    dispatch({ type: 'CLEAR_SELECTED_FEATURES' })
    if (isMarkerMode) {
      markers.add('location', coords, markerOptions)
      eventBus.emit('interact:markerchange', { coords })
    }
  }, [interactionMode, dispatch, markers, markerOptions, eventBus, deselectOnClickOutside])

  const handleInteraction = useCallback(({ point, coords }) => {
    // DOM markers take precedence over layers — check them first
    const markerHit = findMarkerAtPoint(markers, point)
    if (markerHit) {
      dispatch({ type: 'TOGGLE_SELECTED_MARKERS', payload: { markerId: markerHit, multiSelect } })
      return
    }

    const allFeatures = getFeaturesAtPoint(mapProvider, point, { radius: tolerance })
    const hasDataLayers = dataLayers.length > 0

    if (pluginState?.debug) {
      console.log(`--- Features at ${coords} ---`, allFeatures)
    }

    const canMatch = hasDataLayers && (interactionMode === 'select' || interactionMode === 'auto')
    const match = canMatch ? findMatchingFeature(allFeatures, layerConfigMap) : null

    if (match) {
      processFeatureMatch(match)
      return
    }

    processFallback({ coords, hasDataLayers })
  }, [
    mapProvider,
    dataLayers,
    interactionMode,
    multiSelect,
    dispatch,
    markers,
    layerConfigMap,
    pluginState?.debug,
    tolerance,
    processFeatureMatch,
    processFallback
  ])

  useSelectionChangeEmitter(eventBus, selectedFeatures, selectedMarkers, selectionBounds)

  return { handleInteraction }
}
