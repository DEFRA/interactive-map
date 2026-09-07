import { useEffect, useRef } from 'react'
import { EVENTS } from '../../../../src/config/events.js'
import { isStandaloneLabel } from '../../../../src/utils/symbolUtils.js'
import { scaleFactor } from '../../../../src/config/appConfig.js'
import { buildLayerConfigMap } from '../utils/featureQueries.js'
import { getGeometryCenter } from '../utils/spatial.js'

// Only called after toFeatureItem's own `config?.labelProperty` guard, so config is always
// truthy here — no defensive null-config branch needed (that was only for findFeatureById's own
// direct-lookup path, since removed along with the mapProvider.getVisibleFeatures re-query it did).
const getFeatureId = (feature, config) => feature.properties?.[config.idProperty] ?? feature.id

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
      const item = { id: marker.id, label: marker.label, isMarker: true }
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
  const rawId = getFeatureId(feature, config)
  const stringId = rawId == null ? null : String(rawId)
  if (stringId == null || seenIds.has(stringId)) {
    return null
  }
  seenIds.add(stringId)
  const label = feature.properties?.[config.labelProperty] ?? stringId
  // Keeps the full resolved shape (raw id, layer config, geometry, properties) alongside the
  // listbox-facing id/label — not just for building the item, but so useActiveItemHandler below
  // can resolve "what is this" from this same object later, without re-querying the map engine.
  // Only id/label/x/y ever reach MAP_SET_SPATIAL_LIST itself (see toPublicItem) — the rest stays
  // internal, in itemsRef.
  const item = {
    id: stringId,
    label,
    isMarker: false,
    featureId: rawId,
    layerId: config.layerId,
    idProperty: config.idProperty,
    geometry: feature.geometry,
    properties: feature.properties
  }
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

/**
 * Rebuilds the keyboard-navigable item list whenever the map moves or data changes. Collects
 * visible markers (by DOM visibility) and visible features (by viewport query), keeps the
 * result in itemsRef for useActiveItemHandler to resolve against later, and tells
 * spatialListRegistry its items have changed so the shared listbox stays in sync with what's
 * visible. Features.jsx/useFeatureItems.js only ever render id/label/x/y from each item — the
 * rest (isMarker, geometry, properties, layer config) rides along unused there, but is what
 * lets useActiveItemHandler resolve "what is this" from the same object later, with nothing to
 * re-derive and no separate lean/rich shape to keep in sync.
 *
 * interact no longer emits MAP_SET_SPATIAL_LIST directly — spatialListRegistry owns that (see its
 * own doc comment for why: a single "whoever emits last wins" event doesn't scale once more
 * than one plugin, e.g. draw mid-edit, needs to contribute to or take over the same list).
 */
function useItemListSync ({ markers, mapSize, interactionModes, layers, mapProvider, multiSelect, spatialListRegistry, eventBus, itemsRef }) {
  const multiSelectRef = useRef(multiSelect)
  multiSelectRef.current = multiSelect // always-current for the provider's getItems below, same convention as itemsRef

  useEffect(() => {
    const handleMoveEnd = () => {
      const items = []
      if (interactionModes?.includes('selectMarker')) {
        items.push(...collectVisibleMarkers(markers, mapProvider, mapSize))
      }
      if (interactionModes?.includes('selectFeature') && layers.length > 0) {
        items.push(...collectVisibleFeatures(mapProvider, layers, mapSize))
      }
      itemsRef.current = items
      spatialListRegistry.notifyItemsChanged('interact')
    }
    handleMoveEnd()
    eventBus.on(EVENTS.MAP_MOVE_END, handleMoveEnd)
    eventBus.on(EVENTS.MAP_DATA_CHANGE, handleMoveEnd)
    return () => {
      eventBus.off(EVENTS.MAP_MOVE_END, handleMoveEnd)
      eventBus.off(EVENTS.MAP_DATA_CHANGE, handleMoveEnd)
    }
  }, [markers, mapSize, interactionModes, layers, mapProvider, multiSelect, spatialListRegistry, eventBus, itemsRef])

  // Registers once, for the lifetime of the hook — getItems reads itemsRef/multiSelectRef
  // fresh on every call, so there's never a need to re-register just because a prop changed;
  // the effect above already pushes fresh data out via notifyItemsChanged. Declared after
  // that effect so this registration's own immediate recompute (inside the registry) already
  // sees whatever the effect above just computed on this same mount, rather than momentarily
  // registering with empty items and correcting a moment later.
  useEffect(() => {
    spatialListRegistry.registerItemProvider('interact', {
      getItems: () => ({ items: itemsRef.current, multiselectable: multiSelectRef.current, label: 'Map features' })
    })
    return () => { spatialListRegistry.unregisterItemProvider('interact') }
  }, [spatialListRegistry, itemsRef])
}

/**
 * Listens for MAP_SET_ACTIVE_ITEM and resolves the active item to its full feature/marker data,
 * storing it in both a ref (for synchronous access) and plugin state (for highlight rendering).
 * Shows the keyboard cursor ring without firing interact:selectionchange — committing the item
 * to the real selection only happens when the user presses Enter/Space.
 *
 * Resolves purely by looking the id up in itemsRef (the same list useItemListSync just built) —
 * deliberately not a fresh mapProvider.getVisibleFeatures() query. This fires on every roving-
 * tabindex move (every arrow-key press while browsing the list), so re-querying the map engine
 * here — as an earlier version of this hook did — meant every keystroke re-ran the same query
 * useItemListSync had just run moments before, plus a second linear scan through the result, to
 * re-derive data already computed once and discarded. A stale/out-of-range id (e.g. the map
 * panned since the list was built) simply resolves to nothing, same as before.
 */
function useActiveItemHandler ({ itemsRef, eventBus, dispatch, listboxActiveItemRef }) {
  useEffect(() => {
    const handle = ({ id }) => {
      if (id === null) {
        listboxActiveItemRef.current = null
        dispatch({ type: 'SET_LISTBOX_ACTIVE', payload: null })
        return
      }
      const item = itemsRef.current.find(i => i.id === id)
      if (!item) {
        return
      }
      if (item.isMarker) {
        listboxActiveItemRef.current = { id, isMarker: true }
        dispatch({ type: 'SET_LISTBOX_ACTIVE', payload: null })
        return
      }
      const payload = {
        featureId: item.featureId,
        layerId: item.layerId,
        idProperty: item.idProperty,
        geometry: item.geometry
      }
      listboxActiveItemRef.current = { id, isMarker: false, ...payload, properties: item.properties }
      dispatch({ type: 'SET_LISTBOX_ACTIVE', payload })
    }
    eventBus.on(EVENTS.MAP_SET_ACTIVE_ITEM, handle)
    return () => { eventBus.off(EVENTS.MAP_SET_ACTIVE_ITEM, handle) }
  }, [itemsRef, eventBus, dispatch, listboxActiveItemRef])
}

/**
 * Handles MAP_SELECT_ITEM (Enter/Space keypress) by promoting the currently active
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
    eventBus.on(EVENTS.MAP_SELECT_ITEM, handleConfirm)
    return () => { eventBus.off(EVENTS.MAP_SELECT_ITEM, handleConfirm) }
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
 * @param {{ mapState: object, pluginState: object, services: object, mapProvider: object, spatialListRegistry: object }} params
 */
export function useMapItemList ({ mapState, pluginState, services, mapProvider, spatialListRegistry }) {
  const { markers, mapSize } = mapState
  const { dispatch, interactionModes, layers, multiSelect } = pluginState
  const { eventBus } = services
  const listboxActiveItemRef = useRef(null)
  const itemsRef = useRef([])
  useItemListSync({ markers, mapSize, interactionModes, layers, mapProvider, multiSelect, spatialListRegistry, eventBus, itemsRef })
  useActiveItemHandler({ itemsRef, eventBus, dispatch, listboxActiveItemRef })
  useSelectItemHandler({ eventBus, dispatch, listboxActiveItemRef, multiSelect })
}
