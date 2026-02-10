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
  const { dispatch, dataLayers, interactionMode, multiSelect, contiguous, markerColor, selectedFeatures, selectionBounds } = pluginState
  const { eventBus } = services
  const lastEmittedSelectionChange = useRef(null)
  const layerConfigMap = buildLayerConfigMap(dataLayers)

  const handleInteraction = useCallback(({ point, coords }) => {
    const allFeatures = getFeaturesAtPoint(mapProvider, point)
    const hasDataLayers = dataLayers.length > 0

    // Debug option to inspect the map style data
    if (pluginState?.debug) {
      console.log(`--- Features at ${coords} ---`)
      console.log(allFeatures)
    }

    const canMatchFeature = hasDataLayers && (interactionMode === 'select' || interactionMode === 'auto')
    const match = canMatchFeature ? findMatchingFeature(allFeatures, layerConfigMap) : null

    if (match) {
      markers.remove('location')
      const { feature, config } = match

      const isNewFeatureContiguous = contiguous && isContiguousWithAny(feature, selectedFeatures)

      const featureId = config.idProperty
        ? feature.properties?.[config.idProperty]
        : feature.id

      if (featureId) {
        dispatch({
          type: 'TOGGLE_SELECTED_FEATURES',
          payload: {
            featureId,
            multiSelect,
            layerId: config.layerId,
            idProperty: config.idProperty,
            properties: feature.properties,
            geometry: feature.geometry,
            replaceAll: contiguous && !isNewFeatureContiguous
          },
        })
      }

      return
    }

    // Marker mode
    if (interactionMode === 'marker' || (interactionMode === 'auto' && hasDataLayers)) {
      dispatch({ type: 'CLEAR_SELECTED_FEATURES' })
      markers.add('location', coords, { color: markerColor })

      eventBus.emit('interact:markerchange', { coords })
    }
  }, [mapProvider, dataLayers, interactionMode, multiSelect, eventBus, dispatch, markers])

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
