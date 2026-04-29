import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { isStandaloneLabel } from '../../../../src/utils/symbolUtils.js'
import { buildLayerConfigMap } from '../utils/featureQueries.js'

const getFeatureId = (feature, config) =>
  config ? (feature.properties?.[config.idProperty] ?? feature.id) : null

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
    if (!marker.label) { continue }
    const el = markers.markerRefs?.get(marker.id)
    if (!isStandaloneLabel(marker) && el && isInViewport(el)) {
      items.push({ id: marker.id, label: marker.label })
    }
  }
  return items
}

const toFeatureItem = (feature, layerConfigMap, seenIds) => {
  const config = layerConfigMap[feature.layer?.id]
  if (!config?.labelProperty) {
    return null
  }
  const id = getFeatureId(feature, config)
  const stringId = id == null ? null : String(id)
  if (stringId == null || seenIds.has(stringId)) {
    return null
  }
  seenIds.add(stringId)
  const layerLabel = config.label || config.layerId
  const label = config.labelProperty
    ? (feature.properties?.[config.labelProperty] ?? stringId)
    : `${layerLabel} ${stringId}`
  return { id: stringId, label }
}

const collectVisibleFeatures = (mapProvider, layers) => {
  const items = []
  const seenIds = new Set()
  const layerIds = layers.map(layer => layer.layerId)
  const layerConfigMap = buildLayerConfigMap(layers)
  const features = mapProvider.getVisibleFeatures(layerIds)
  for (const feature of features) {
    const item = toFeatureItem(feature, layerConfigMap, seenIds)
    if (item) {
      items.push(item)
    }
  }
  return items
}

const findFeatureById = (features, layerConfigMap, targetId) => {
  for (const feature of features) {
    const config = layerConfigMap[feature.layer?.id]
    const rawId = getFeatureId(feature, config)
    if (rawId != null && String(rawId) === String(targetId)) {
      return { feature, config, rawId }
    }
  }
  return null
}

function useItemListSync ({ markers, interactionModes, layers, mapProvider, multiSelect, eventBus }) {
  useEffect(() => {
    const handleMoveEnd = () => {
      const items = []
      if (interactionModes.includes('selectMarker')) {
        items.push(...collectVisibleMarkers(markers))
      }
      if (interactionModes.includes('selectFeature') && layers.length > 0) {
        items.push(...collectVisibleFeatures(mapProvider, layers))
      }
      eventBus.emit(EVENTS.MAP_SET_FEATURES, { items, multiselectable: multiSelect })
    }
    eventBus.on(EVENTS.MAP_MOVE_END, handleMoveEnd)
    eventBus.on(EVENTS.MAP_DATA_CHANGE, handleMoveEnd)
    return () => {
      eventBus.off(EVENTS.MAP_MOVE_END, handleMoveEnd)
      eventBus.off(EVENTS.MAP_DATA_CHANGE, handleMoveEnd)
    }
  }, [markers, interactionModes, layers, mapProvider, multiSelect, eventBus])
}

// Shows the selection ring without firing interact:selectionchange.
// Marker rings are handled by Markers.jsx listening to map:setactivefeature directly.
// Feature rings are handled by useHighlightSync reading listboxActiveItem from plugin state.
function useActiveItemHandler ({ markers, interactionModes, layers, mapProvider, eventBus, dispatch, listboxActiveItemRef }) {
  useEffect(() => {
    const handle = ({ id }) => {
      if (id === null) {
        listboxActiveItemRef.current = null
        dispatch({ type: 'SET_LISTBOX_ACTIVE', payload: null })
        return
      }
      const markerMatch = markers.items.find(m => m.id === id)
      if (markerMatch) {
        listboxActiveItemRef.current = { id, isMarker: true }
        dispatch({ type: 'SET_LISTBOX_ACTIVE', payload: null })
        return
      }
      if (interactionModes.includes('selectFeature') && layers.length > 0) {
        const layerIds = layers.map(layer => layer.layerId)
        const layerConfigMap = buildLayerConfigMap(layers)
        const features = mapProvider.getVisibleFeatures(layerIds)
        const match = findFeatureById(features, layerConfigMap, id)
        if (match) {
          const payload = {
            featureId: match.rawId,
            layerId: match.config.layerId,
            idProperty: match.config.idProperty,
            geometry: match.feature.geometry
          }
          listboxActiveItemRef.current = { id, isMarker: false, ...payload, properties: match.feature.properties }
          dispatch({ type: 'SET_LISTBOX_ACTIVE', payload })
        }
      }
    }
    eventBus.on(EVENTS.MAP_SET_ACTIVE_FEATURE, handle)
    return () => { eventBus.off(EVENTS.MAP_SET_ACTIVE_FEATURE, handle) }
  }, [markers, interactionModes, layers, mapProvider, eventBus, dispatch, listboxActiveItemRef])
}

// Promotes the listbox-active item to a real selection, firing interact:selectionchange.
function useSelectItemHandler ({ eventBus, dispatch, listboxActiveItemRef, multiSelect }) {
  useEffect(() => {
    const handleConfirm = () => {
      const item = listboxActiveItemRef.current
      if (!item) {
        return
      }
      if (item.isMarker) {
        dispatch({ type: 'TOGGLE_SELECTED_MARKERS', payload: { markerId: item.id, multiSelect } })
      } else {
        const { featureId, layerId, idProperty, geometry, properties } = item
        dispatch({
          type: 'TOGGLE_SELECTED_FEATURES',
          payload: { featureId, layerId, idProperty, geometry, properties, multiSelect, replaceAll: !multiSelect }
        })
      }
    }
    eventBus.on(EVENTS.MAP_SELECT_FEATURE, handleConfirm)
    return () => { eventBus.off(EVENTS.MAP_SELECT_FEATURE, handleConfirm) }
  }, [eventBus, dispatch, listboxActiveItemRef, multiSelect])
}

export function useMapItemList ({ mapState, pluginState, services, mapProvider }) {
  const { markers } = mapState
  const { dispatch, interactionModes, layers, multiSelect } = pluginState
  const { eventBus } = services
  const listboxActiveItemRef = useRef(null)
  useItemListSync({ markers, interactionModes, layers, mapProvider, multiSelect, eventBus })
  useActiveItemHandler({ markers, interactionModes, layers, mapProvider, eventBus, dispatch, listboxActiveItemRef })
  useSelectItemHandler({ eventBus, dispatch, listboxActiveItemRef, multiSelect })
}
