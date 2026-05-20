import { useCallback, useEffect, useRef } from 'react'
import { areAllContiguous, isContiguousWithAny } from '../utils/spatial.js'
import { getFeaturesAtPoint, findMatchingFeature, buildLayerConfigMap } from '../utils/featureQueries.js'
import { scaleFactor } from '../../../../src/config/appConfig.js'
import { isStandaloneLabel } from '../../../../src/utils/symbolUtils.js'

/**
 * Returns the id of the first DOM marker whose visual bounds contain the given point.
 *
 * MAP_CLICK point is container-relative; getBoundingClientRect is viewport-relative.
 * We convert by subtracting the markers container's top-left (.im-c-viewport__markers has
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
    const container = el.closest('.im-c-viewport__markers') || el.parentElement
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
    const awaitingBounds = selectedFeatures.length > 0 && !selectionBounds
    if (awaitingBounds) {
      return
    }

    const prev = lastEmittedSelectionChange.current
    const wasEmpty = prev === null || (prev.features.length === 0 && prev.markers.length === 0)
    if (wasEmpty && selectedFeatures.length === 0 && selectedMarkers.length === 0) {
      return
    }

    eventBus.emit('interact:selectionchange', {
      selectedFeatures,
      selectedMarkers,
      selectionBounds,
      contiguous: areAllContiguous(selectedFeatures)
    })

    lastEmittedSelectionChange.current = { features: selectedFeatures, markers: selectedMarkers }
  }, [selectedFeatures, selectedMarkers, selectionBounds])
}

/**
 * Given a set of selected features, returns the largest contiguous sub-group
 * that stays connected to features[0]. Used when deselecting a feature that
 * may act as a bridge between two otherwise disconnected parts of the selection.
 *
 * Uses flood-fill: starts from features[0] and repeatedly adds any feature that
 * touches the growing connected set, until no more can be added.
 *
 * @param {Array} features - Current selection minus the feature being deselected.
 *   Each feature must have an enriched `geometry` (set by the provider at selection time).
 * @returns {Array|null} The connected sub-group anchored at features[0],
 *   or null if all features are already contiguous (no trimming needed).
 */
const trimToContiguousGroup = (features) => {
  const connected = new Set([0])
  let changed = true
  while (changed) {
    changed = false
    for (let i = 1; i < features.length; i++) {
      if (connected.has(i)) {
        continue
      }
      const connectedFeatures = [...connected].map(idx => features[idx])
      if (features[i].geometry?.type && isContiguousWithAny(features[i], connectedFeatures)) {
        connected.add(i)
        changed = true
      }
    }
  }
  if (connected.size === features.length) {
    return null
  }
  return [...connected].map(idx => features[idx])
}

const buildTogglePayload = (featureId, multiSelect, config, feature) => ({
  featureId,
  multiSelect,
  layerId: config.layerId,
  idProperty: config.idProperty,
  properties: feature.properties,
  geometry: feature.geometry
})

/**
 * Enforces the contiguous selection constraint when a feature is clicked.
 * Intercepts the click and dispatches its own action when needed, returning
 * true so the caller knows not to dispatch again.
 *
 * Two cases are handled:
 *  - Deselecting a feature: if removing it would split the remaining selection
 *    into disconnected parts, the selection is trimmed to the group that stays
 *    connected to the first selected feature, rather than allowing a split.
 *  - Adding a feature: if the new feature does not touch any already-selected
 *    feature, the entire existing selection is replaced rather than extended,
 *    keeping the selection contiguous.
 *
 * Returns false (no-op) when the click is a straightforward toggle that does
 * not violate contiguity, leaving the caller to dispatch normally.
 *
 * @param {{ featureId, feature, config, selectedFeatures, dispatch, multiSelect }} params
 *   feature.geometry must already be enriched by the provider before calling.
 * @returns {boolean} True if this function dispatched; false if the caller should.
 */
const resolveContiguousDispatch = ({ featureId, feature, config, selectedFeatures, dispatch, multiSelect }) => {
  if (!selectedFeatures.length) {
    return false
  }

  const existingIndex = selectedFeatures.findIndex(
    f => f.featureId === featureId && f.layerId === config.layerId
  )

  if (existingIndex !== -1) {
    // Deselect: trim to first connected group if the removal splits the selection.
    if (selectedFeatures.length < 3) { // NOSONAR
      return false
    }
    const remaining = selectedFeatures.filter((_, i) => i !== existingIndex)
    const trimmed = trimToContiguousGroup(remaining)
    if (!trimmed) {
      return false
    }
    dispatch({ type: 'SET_SELECTED_FEATURES', payload: trimmed })
    return true
  }

  // Add: replace selection if the new feature doesn't touch any existing feature.
  const validSelected = selectedFeatures.filter(f => f.geometry?.type)
  if (!feature.geometry?.type || !validSelected.length) {
    return false
  }
  if (isContiguousWithAny(feature, validSelected)) {
    return false
  }

  dispatch({
    type: 'TOGGLE_SELECTED_FEATURES',
    payload: { ...buildTogglePayload(featureId, multiSelect, config, feature), replaceAll: true }
  })
  return true
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
const useHandleInteraction = ({ mapProvider, layers, interactionModes, multiSelect, dispatch, markers, layerConfigMap, debug, tolerance, processFeatureMatch, processFallback, scale }) => {
  return useCallback(({ point, coords }) => {
    const debugFeatures = debug ? getFeaturesAtPoint(mapProvider, point, { radius: tolerance }) : null
    if (debugFeatures) {
      console.log(`--- Features at ${coords} ---`, debugFeatures) // NOSONAR
    }
    if (interactionModes.includes('selectMarker')) {
      const markerHit = findMarkerAtPoint(markers, point, scale)
      if (markerHit) {
        dispatch({ type: 'TOGGLE_SELECTED_MARKERS', payload: { markerId: markerHit, multiSelect } })
        return
      }
    }
    if (interactionModes.includes('selectFeature') && layers.length > 0) {
      const allFeatures = debugFeatures ?? getFeaturesAtPoint(mapProvider, point, { radius: tolerance })
      const match = findMatchingFeature(allFeatures, layerConfigMap)
      if (match) {
        processFeatureMatch(match)
        return
      }
    }
    processFallback({ coords })
  }, [mapProvider, layers, interactionModes, multiSelect, dispatch, markers, layerConfigMap, debug, tolerance, processFeatureMatch, processFallback, scale])
}

export const useInteractionHandlers = ({ mapState, pluginState, services, mapProvider }) => {
  const { markers, mapSize } = mapState
  const {
    dispatch, layers, interactionModes, multiSelect, contiguous,
    marker: markerOptions, tolerance, selectedFeatures, selectedMarkers,
    selectionBounds, deselectOnClickOutside
  } = pluginState
  const { eventBus } = services
  const layerConfigMap = buildLayerConfigMap(layers)
  const scale = scaleFactor[mapSize] ?? 1

  const processFeatureMatch = useCallback(({ feature, config }) => {
    markers.remove('location')
    const featureId = feature.properties?.[config.idProperty] ?? feature.id
    if (featureId == null) {
      return
    }
    const enrichedGeometry = mapProvider.getFeatureGeometry?.(config.layerId, featureId, config.idProperty)
    const enrichedFeature = enrichedGeometry ? { ...feature, geometry: enrichedGeometry } : feature
    if (contiguous && multiSelect) {
      const handled = resolveContiguousDispatch(
        { featureId, feature: enrichedFeature, config, selectedFeatures, dispatch, multiSelect }
      )
      if (handled) {
        return
      }
    }
    dispatch({ type: 'TOGGLE_SELECTED_FEATURES', payload: buildTogglePayload(featureId, multiSelect, config, enrichedFeature) })
  }, [markers, dispatch, multiSelect, contiguous, selectedFeatures, mapProvider])

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

  const handleInteraction = useHandleInteraction({
    mapProvider,
    layers,
    interactionModes,
    multiSelect,
    dispatch,
    markers,
    layerConfigMap,
    debug: pluginState?.debug,
    tolerance,
    processFeatureMatch,
    processFallback,
    scale
  })

  useSelectionChangeEmitter(eventBus, selectedFeatures, selectedMarkers, selectionBounds)
  return { handleInteraction }
}
