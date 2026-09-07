import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { isStandaloneLabel } from '../../../../src/utils/symbolUtils.js'
import { scaleFactor } from '../../../../src/config/appConfig.js'
import { buildLayerConfigMap } from '../utils/featureQueries.js'
import { getGeometryCenter } from '../utils/spatial.js'

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

// Screen position for a [lng, lat] point, scaled for the current mapSize — same correction
// useMarkersAPI.js's projectCoords applies (the map canvas itself is rendered at a different
// resolution per mapSize; nothing to do with CSS transforms). mapProvider.mapToScreen is a
// provider-agnostic method (implemented by every provider, including OpenLayers/Esri), so this
// helper works unchanged once OpenLayers' getVisibleFeatures stops being a stub.
const projectToScreen = (mapProvider, mapSize, coords) => {
  const { x, y } = mapProvider.mapToScreen(coords)
  return { x: x * scaleFactor[mapSize], y: y * scaleFactor[mapSize] }
}

// x/y are the marker's own screen position — computed fresh here rather than read off
// marker.x/marker.y, which only reflect where the marker was when added/last updated, not the
// current pan position. Used to position the corresponding accessible list item so touch/voice
// AT overlays (e.g. macOS Voice Control's "Show Numbers") land on the actual feature instead of
// stacking at the top-left of the viewport.
const collectVisibleMarkers = (markers, mapProvider, mapSize) => {
  const items = []
  for (const marker of markers.items) {
    if (!marker.label) { continue }
    const el = markers.markerRefs?.get(marker.id)
    if (!isStandaloneLabel(marker) && el && isInViewport(el)) {
      const item = { id: marker.id, label: marker.label }
      if (marker.coords) {
        Object.assign(item, projectToScreen(mapProvider, mapSize, marker.coords))
      }
      items.push(item)
    }
  }
  return items
}

const toFeatureItem = (feature, layerConfigMap, seenIds, mapProvider, mapSize) => {
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
  const label = feature.properties?.[config.labelProperty] ?? stringId
  const item = { id: stringId, label }
  // Bbox-centre of the feature's geometry (polygon or line) — see getGeometryCenter's own doc
  // for why a bbox centre rather than a true centroid. null when the feature carries no usable
  // geometry (e.g. OpenLayers' getVisibleFeatures, currently a stub returning [] — see PR notes).
  const center = getGeometryCenter(feature)
  if (center) {
    Object.assign(item, projectToScreen(mapProvider, mapSize, center))
  }
  return item
}

const collectVisibleFeatures = (mapProvider, layers, mapSize) => {
  const items = []
  const seenIds = new Set()
  const layerIds = layers.map(layer => layer.layerId)
  const layerConfigMap = buildLayerConfigMap(layers)
  const features = mapProvider.getVisibleFeatures(layerIds)
  for (const feature of features) {
    const item = toFeatureItem(feature, layerConfigMap, seenIds, mapProvider, mapSize)
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

/**
 * Rebuilds the keyboard-navigable item list whenever the map moves or data changes.
 * Collects visible markers (by DOM visibility) and visible features (by viewport query),
 * then emits MAP_SET_FEATURES so the listbox stays in sync with what the user can see.
 */
function useItemListSync ({ markers, mapSize, interactionModes, layers, mapProvider, multiSelect, eventBus }) {
  useEffect(() => {
    const handleMoveEnd = () => {
      const items = []
      if (interactionModes?.includes('selectMarker')) {
        items.push(...collectVisibleMarkers(markers, mapProvider, mapSize))
      }
      if (interactionModes?.includes('selectFeature') && layers.length > 0) {
        items.push(...collectVisibleFeatures(mapProvider, layers, mapSize))
      }
      eventBus.emit(EVENTS.MAP_SET_FEATURES, { items, multiselectable: multiSelect })
    }
    handleMoveEnd()
    eventBus.on(EVENTS.MAP_MOVE_END, handleMoveEnd)
    eventBus.on(EVENTS.MAP_DATA_CHANGE, handleMoveEnd)
    return () => {
      eventBus.off(EVENTS.MAP_MOVE_END, handleMoveEnd)
      eventBus.off(EVENTS.MAP_DATA_CHANGE, handleMoveEnd)
    }
  }, [markers, mapSize, interactionModes, layers, mapProvider, multiSelect, eventBus])
}

/**
 * Listens for MAP_SET_ACTIVE_FEATURE and resolves the active item to its full feature/marker data,
 * storing it in both a ref (for synchronous access) and plugin state (for highlight rendering).
 * Shows the keyboard cursor ring without firing interact:selectionchange — committing the item
 * to the real selection only happens when the user presses Enter/Space.
 */
function useActiveItemHandler ({ markers, interactionModes, layers, mapProvider, eventBus, dispatch, listboxActiveItemRef }) {
  useEffect(() => {
    const handle = ({ id }) => {
      if (id === null) {
        listboxActiveItemRef.current = null
        dispatch({ type: 'SET_LISTBOX_ACTIVE', payload: null })
        return
      }
      const hasMarkerMatch = markers.items.some(m => m.id === id)
      if (hasMarkerMatch) {
        listboxActiveItemRef.current = { id, isMarker: true }
        dispatch({ type: 'SET_LISTBOX_ACTIVE', payload: null })
        return
      }
      if (interactionModes?.includes('selectFeature') && layers.length > 0) {
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

/**
 * Handles MAP_SELECT_FEATURE (Enter/Space keypress) by promoting the currently active
 * listbox item to a confirmed selection, dispatching TOGGLE_SELECTED_FEATURES or
 * TOGGLE_SELECTED_MARKERS and triggering interact:selectionchange downstream.
 */
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

/**
 * Orchestrates the keyboard-accessible listbox for the interact plugin.
 *
 * Composes three concerns:
 * - Item list sync — keeps the listbox populated with currently visible markers and features
 * - Active item resolution — translates a listbox cursor position into full feature/marker data
 * - Selection confirmation — commits the active item to the selection on Enter/Space
 *
 * @param {{ mapState: object, pluginState: object, services: object, mapProvider: object }} params
 */
export function useMapItemList ({ mapState, pluginState, services, mapProvider }) {
  const { markers, mapSize } = mapState
  const { dispatch, interactionModes, layers, multiSelect } = pluginState
  const { eventBus } = services
  const listboxActiveItemRef = useRef(null)
  useItemListSync({ markers, mapSize, interactionModes, layers, mapProvider, multiSelect, eventBus })
  useActiveItemHandler({ markers, interactionModes, layers, mapProvider, eventBus, dispatch, listboxActiveItemRef })
  useSelectItemHandler({ eventBus, dispatch, listboxActiveItemRef, multiSelect })
}
