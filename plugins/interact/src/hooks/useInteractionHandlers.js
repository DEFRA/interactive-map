import { useCallback, useEffect, useRef } from 'react'
import { isContiguousWithAny, canSplitFeatures, areAllContiguous } from '../utils/spatial.js'
import { getFeaturesAtPoint, findMatchingFeature, buildLayerConfigMap } from '../utils/featureQueries.js'

export const useInteractionHandlers = ({
  mapState,
  pluginState,
  services,
  mapProvider,
}) => {
  const { markers } = mapState
  const { dispatch, dataLayers, interactionMode, multiSelect, contiguous, markerColor, tolerance, selectedFeatures, selectionBounds } = pluginState
  const { eventBus } = services
  const lastEmittedSelectionChange = useRef(null)
  const layerConfigMap = buildLayerConfigMap(dataLayers)

  const handleInteraction = useCallback(({ point, coords }) => {
    const allFeatures = getFeaturesAtPoint(mapProvider, point, { radius: tolerance })
    const hasDataLayers = dataLayers.length > 0

    if (pluginState?.debug) {
      console.log(`--- Features at ${coords} ---`, allFeatures)
    }

    const canMatch = hasDataLayers && (interactionMode === 'select' || interactionMode === 'auto')
    const match = canMatch ? findMatchingFeature(allFeatures, layerConfigMap) : null

    // 1. Handle Feature Match
    if (match) {
      processFeatureMatch(match)
      return
    }

    // 2. Handle Marker Mode (Fallback)
    const isMarkerMode = interactionMode === 'marker' || (interactionMode === 'auto' && hasDataLayers)
    if (isMarkerMode) {
      dispatch({ type: 'CLEAR_SELECTED_FEATURES' })
      markers.add('location', coords, { color: markerColor })
      eventBus.emit('interact:markerchange', { coords })
    }

    // Internal helper to keep complexity low
    function processFeatureMatch({ feature, config }) {
      markers.remove('location')
      const isNewContiguous = contiguous && isContiguousWithAny(feature, selectedFeatures)
      const featureId = feature.properties?.[config.idProperty] ?? feature.id

      if (!featureId) {
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
    }
  }, [
    mapProvider,
    dataLayers,
    interactionMode,
    multiSelect,
    eventBus,
    dispatch,
    markers,
    contiguous,
    selectedFeatures,
    layerConfigMap,
    pluginState?.debug,
    tolerance,
    markerColor
  ])

  // Emit event when selectedFeatures change
  useEffect(() => {
    // Skip if features exist but bounds not yet calculated
    const awaitingBounds = selectedFeatures.length > 0 && !selectionBounds
    if (awaitingBounds) {
      return
    }

    // Skip if selection was already empty and remains empty
    const prev = lastEmittedSelectionChange.current
    const wasEmpty = prev === null || prev.length === 0
    if (wasEmpty && selectedFeatures.length === 0) {
      return
    }

    eventBus.emit('interact:selectionchange', {
      selectedFeatures,
      selectionBounds,
      canMerge: areAllContiguous(selectedFeatures),
      canSplit: canSplitFeatures(selectedFeatures)
    })

    lastEmittedSelectionChange.current = selectedFeatures
  }, [selectedFeatures, selectionBounds])

  return {
    handleInteraction
  }
}
