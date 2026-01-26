import { useCallback, useEffect, useRef } from 'react'
import { getFeaturesAtPoint, findMatchingFeature, buildLayerConfigMap } from '../utils/featureQueries.js'

export const useInteractionHandlers = ({
  mapState,
  pluginState,
  services,
  mapProvider,
}) => {
  const { markers } = mapState
  const { dispatch, dataLayers, interactionMode, multiSelect, markerColor, selectedFeatures, selectionBounds } = pluginState
  const { eventBus } = services
  const lastEmittedSelectionChange = useRef(null)
  const layerConfigMap = buildLayerConfigMap(dataLayers)

  const handleInteraction = useCallback(({ point, coords }) => {
    const allFeatures = getFeaturesAtPoint(mapProvider, point)
    const hasDataLayers = dataLayers.length > 0

    const match = hasDataLayers &&
      (interactionMode === 'select' || interactionMode === 'auto')
        ? findMatchingFeature(allFeatures, layerConfigMap)
        : null

    if (match) {
      markers.remove('location')

      const { feature, config } = match
      const featureId = feature.properties?.[config.idProperty]

      if (featureId) {
        dispatch({
          type: 'TOGGLE_SELECTED_FEATURES',
          payload: {
            featureId,
            multiSelect,
            layerId: config.layerId,
            idProperty: config.idProperty,
            properties: feature.properties,
            geometry: feature.geometry
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
    if (!selectionBounds || selectedFeatures === lastEmittedSelectionChange.current) {
      return
    }

    eventBus.emit('interact:selectionchange', {
      selectedFeatures,
      selectionBounds
    })

    lastEmittedSelectionChange.current = selectedFeatures
  }, [selectedFeatures, selectionBounds])

  return {
    handleInteraction
  }
}
