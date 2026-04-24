import { useCallback, useEffect, useRef } from 'react'
import { isContiguousWithAny, canSplitFeatures, areAllContiguous } from '../utils/spatial.js'
import { getFeaturesAtPoint, findMatchingFeature, buildLayerConfigMap } from '../utils/featureQueries.js'
import { scaleFactor } from '../../../../src/config/appConfig.js'
import { isStandaloneLabel } from '../../../../src/utils/symbolUtils.js'

/**
 * Returns the id of the first DOM marker whose visual bounds contain the given point.
 *
 * MAP_CLICK point is container-relative; getBoundingClientRect is viewport-relative.
 * We convert by subtracting the features container's top-left (.im-c-features has
 * inset:0 over the same area as the map canvas, giving the correct offset).
 *
 * @param {Object} markers - markers object from mapState (has .items and .markerRefs)
 * @param {{ x: number, y: number }} point - container-relative pixel coordinates
 * @param {number} scale - scaleFactor for the current mapSize (e.g. 1.5 for medium)
 * @returns {string|null}
 */

const findMarkerAtPoint = (markers, point, scale) => {
  for (const marker of markers.items) {
    const el = markers.markerRefs?.get(marker.id)
    if (!el || isStandaloneLabel(marker)) {
      continue
    }
    const container = el.closest('.im-c-features') || el.parentElement
    const parentRect = container ? container.getBoundingClientRect() : { left: 0, top: 0 }
    const { left, top, right, bottom } = el.getBoundingClientRect()
    const scaledX = point.x * scale
    const scaledY = point.y * scale
    if (
      scaledX >= left - parentRect.left && scaledX <= right - parentRect.left &&
      scaledY >= top - parentRect.top && scaledY <= bottom - parentRect.top
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

/**
 * Core interaction hook. Processes map clicks in fixed priority order:
 * selectMarker → selectFeature → placeMarker (fallback).
 *
 * Which steps are active is controlled by `pluginState.interactionModes`. Steps not
 * present in the array are skipped entirely — e.g. omitting `'selectMarker'` means
 * marker hit-testing is never performed.
 *
 * @param {Object} deps
 * @param {Object} deps.mapState - Map state including markers and mapSize
 * @param {Object} deps.pluginState - Plugin state including interactionModes, layers, etc.
 * @param {Object} deps.services - Services including eventBus
 * @param {Object} deps.mapProvider - Map provider instance for feature queries
 * @returns {{ handleInteraction: Function }}
 */
export const useInteractionHandlers = ({ mapState, pluginState, services, mapProvider }) => {
  const { markers, mapSize } = mapState
  const { dispatch, layers, interactionModes, multiSelect, contiguous, marker: markerOptions, tolerance, selectedFeatures, selectedMarkers, selectionBounds, deselectOnClickOutside } = pluginState
  const { eventBus } = services
  const layerConfigMap = buildLayerConfigMap(layers)
  const scale = scaleFactor[mapSize] ?? 1
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

  const processFallback = useCallback(({ coords }) => {
    const canPlace = interactionModes.includes('placeMarker')
    if (!canPlace && !deselectOnClickOutside) {
      return
    }
    dispatch({ type: 'CLEAR_SELECTED_FEATURES' })
    if (canPlace) {
      markers.add('location', coords, markerOptions)
      eventBus.emit('interact:markerchange', { coords })
    }
  }, [interactionModes, dispatch, markers, markerOptions, eventBus, deselectOnClickOutside])

  const handleInteraction = useCallback(({ point, coords }) => {
    if (interactionModes.includes('selectMarker')) {
      const markerHit = findMarkerAtPoint(markers, point, scale)
      if (markerHit) {
        dispatch({ type: 'TOGGLE_SELECTED_MARKERS', payload: { markerId: markerHit, multiSelect } })
        return
      }
    }

    if (interactionModes.includes('selectFeature') && layers.length > 0) {
      const allFeatures = getFeaturesAtPoint(mapProvider, point, { radius: tolerance })
      if (pluginState?.debug) {
        console.log(`--- Features at ${coords} ---`, allFeatures)
      }
      const match = findMatchingFeature(allFeatures, layerConfigMap)
      if (match) {
        processFeatureMatch(match)
        return
      }
    }

    processFallback({ coords })
  }, [
    mapProvider,
    layers,
    interactionModes,
    multiSelect,
    dispatch,
    markers,
    layerConfigMap,
    pluginState?.debug,
    tolerance,
    processFeatureMatch,
    processFallback,
    scale
  ])
  useSelectionChangeEmitter(eventBus, selectedFeatures, selectedMarkers, selectionBounds)
  return { handleInteraction }
}
