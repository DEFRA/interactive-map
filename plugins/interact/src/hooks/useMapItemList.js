import { useEffect } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { isStandaloneLabel } from '../../../../src/utils/symbolUtils.js'
import { buildLayerConfigMap } from '../utils/featureQueries.js'

const isInViewport = (el) => {
  const container = el.closest('.im-c-viewport__markers')
  if (!container) {
    return false
  }
  const containerRect = container.getBoundingClientRect()
  const { left, right, top, bottom } = el.getBoundingClientRect()
  return right > containerRect.left && left < containerRect.right &&
    bottom > containerRect.top && top < containerRect.bottom
}

const collectVisibleMarkers = (markers) => {
  const items = []
  for (const marker of markers.items) {
    if (isStandaloneLabel(marker)) {
      continue
    }
    const el = markers.markerRefs?.get(marker.id)
    if (!el || !isInViewport(el)) {
      continue
    }
    items.push({ id: marker.id, label: marker.label || marker.id })
  }
  return items
}

const collectVisibleFeatures = (mapProvider, layers) => {
  const items = []
  const layerIds = layers.map(layer => layer.layerId)
  const layerConfigMap = buildLayerConfigMap(layers)
  const features = mapProvider.getVisibleFeatures(layerIds)
  for (const feature of features) {
    const config = layerConfigMap[feature.layer?.id]
    if (!config) {
      continue
    }
    const id = feature.properties?.[config.idProperty] ?? feature.id
    if (id == null) {
      continue
    }
    const label = config.labelProperty
      ? (feature.properties?.[config.labelProperty] ?? String(id))
      : String(id)
    items.push({ id: String(id), label })
  }
  return items
}

const findFeatureById = (features, layerConfigMap, targetId) => {
  for (const feature of features) {
    const config = layerConfigMap[feature.layer?.id]
    if (!config) {
      continue
    }
    const id = feature.properties?.[config.idProperty] ?? feature.id
    if (id != null && String(id) === String(targetId)) {
      return { feature, config }
    }
  }
  return null
}

export function useMapItemList ({ mapState, pluginState, services, mapProvider }) {
  const { markers } = mapState
  const { dispatch, interactionModes, layers } = pluginState
  const { eventBus } = services

  useEffect(() => {
    const handleMoveEnd = () => {
      const items = []
      if (interactionModes.includes('selectMarker')) {
        items.push(...collectVisibleMarkers(markers))
      }
      if (interactionModes.includes('selectFeature') && layers.length > 0) {
        items.push(...collectVisibleFeatures(mapProvider, layers))
      }
      eventBus.emit(EVENTS.MAP_SET_FEATURES, { items })
    }

    eventBus.on(EVENTS.MAP_MOVE_END, handleMoveEnd)
    return () => { eventBus.off(EVENTS.MAP_MOVE_END, handleMoveEnd) }
  }, [markers, interactionModes, layers, mapProvider, eventBus])

  useEffect(() => {
    const handle = ({ id }) => {
      if (id === null) {
        dispatch({ type: 'CLEAR_SELECTED_FEATURES' })
        return
      }
      const markerMatch = markers.items.find(m => m.id === id)
      if (markerMatch) {
        dispatch({ type: 'SELECT_MARKER', payload: { markerId: id, multiSelect: false } })
        return
      }
      if (interactionModes.includes('selectFeature') && layers.length > 0) {
        const layerIds = layers.map(layer => layer.layerId)
        const layerConfigMap = buildLayerConfigMap(layers)
        const features = mapProvider.getVisibleFeatures(layerIds)
        const match = findFeatureById(features, layerConfigMap, id)
        if (match) {
          dispatch({
            type: 'TOGGLE_SELECTED_FEATURES',
            payload: {
              featureId: id,
              multiSelect: false,
              replaceAll: true,
              layerId: match.config.layerId,
              idProperty: match.config.idProperty,
              properties: match.feature.properties,
              geometry: match.feature.geometry
            }
          })
        }
      }
    }

    eventBus.on(EVENTS.MAP_SET_ACTIVE_FEATURE, handle)
    return () => { eventBus.off(EVENTS.MAP_SET_ACTIVE_FEATURE, handle) }
  }, [markers, interactionModes, layers, mapProvider, eventBus, dispatch])
}
