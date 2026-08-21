import { siblingDrawLayerId } from './drawLayerBuckets.js'

const ICON_IMAGE = 'icon-image'
const DRAW_WILDCARD_LAYER_ID = 'draw'

// interactPlugin's 'draw' config entry is a logical wildcard covering every draw-owned layer —
// a selected feature always reports back the literal string 'draw', never the concrete
// draw-{featureId}-fill/-line/-symbol layer that actually exists on the map (see
// plugins/draw/src/adapters/maplibre/featureLayerGroup.js's getLayerId, which this mirrors).
// Highlight rendering needs the real layer (source, type, paint) to draw against, so it's
// resolved here from the feature's own id + geometry type rather than trusted as-is.
const isDrawOwnedLayerId = (layerId) => layerId.startsWith('draw-')

const resolveDrawLayerId = (layerId, featureId, geometryType) => {
  if (layerId !== DRAW_WILDCARD_LAYER_ID) {
    return layerId
  }
  if (geometryType === 'Polygon' || geometryType === 'MultiPolygon') {
    return `draw-${featureId}-fill`
  }
  if (geometryType === 'LineString' || geometryType === 'MultiLineString') {
    return `draw-${featureId}-line`
  }
  return `draw-${featureId}-symbol`
}

const ACTIVE_PREFIX = 'active-highlight'
const ACTIVE_INNER_PREFIX = 'active-highlight-inner'
const SELECTED_PREFIX = 'selected-highlight'

// Inner and selected both use the selected colour/width (black, thin)
const usesSelectedStyle = (prefix) => prefix === SELECTED_PREFIX || prefix === ACTIVE_INNER_PREFIX

const getActiveImageId = (map, imageId) => map._activeSymbolImageMap?.[imageId] ?? null
const getSelectedImageId = (map, imageId) => map._selectedSymbolImageMap?.[imageId] ?? null

// Grouped by layerId, not sourceId: mapbox-gl-draw stores every geometry type in the same
// cold/hot sources, so a point (symbol layer) and a polygon (fill layer) selected together
// share a source — grouping by source would collapse them into one group that can only
// resolve one geometry-type path, silently dropping the other's highlight.
//
// A selection's recorded layerId can also go stale if the feature later moves to its cold/hot
// sibling bucket — see drawLayerBuckets.js.
const addFeatureUnderLayer = (map, featuresByLayer, layerId, { featureId, idProperty, geometry }) => {
  const layer = map.getLayer(layerId)
  if (!layer) {
    return
  }

  if (!featuresByLayer[layerId]) {
    featuresByLayer[layerId] = {
      ids: new Set(),
      fillIds: new Set(),
      idProperty,
      sourceId: layer.source,
      hasFillGeometry: false
    }
  }

  if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
    featuresByLayer[layerId].hasFillGeometry = true
    featuresByLayer[layerId].fillIds.add(featureId)
  }

  featuresByLayer[layerId].ids.add(featureId)
}

const groupFeaturesByLayer = (map, selectedFeatures) => {
  const featuresByLayer = {}

  selectedFeatures?.forEach((feature) => {
    const layerId = resolveDrawLayerId(feature.layerId, feature.featureId, feature.geometry?.type)
    addFeatureUnderLayer(map, featuresByLayer, layerId, feature)
    const sibling = siblingDrawLayerId(layerId)
    if (sibling) {
      addFeatureUnderLayer(map, featuresByLayer, sibling, feature)
    }
  })

  return featuresByLayer
}

const cleanupStaleLayers = (map, previousLayerIds, currentLayerIds, prefix) => {
  previousLayerIds.forEach(layerId => {
    if (!currentLayerIds.has(layerId)) {
      const base = `${prefix}-${layerId}`
      ;[`${base}-fill`, `${base}-line`, `${base}-symbol`].forEach(id => {
        if (map.getLayer(id)) {
          map.setFilter(id, ['==', 'id', ''])
        }
      })
    }
  })
}

const clearPrefixLayers = (map, prefix) => {
  const key = `_${prefix.replaceAll('-', '')}Sources`
  cleanupStaleLayers(map, map[key] || new Set(), new Set(), prefix)
  map[key] = new Set()
}

const applyHighlightLayer = (map, id, type, sourceId, srcLayer, paint, filter) => {
  const existed = !!map.getLayer(id)
  if (!existed) {
    map.addLayer({
      id,
      type,
      source: sourceId,
      ...(srcLayer && { 'source-layer': srcLayer }),
      paint
    })
  }
  Object.entries(paint).forEach(([prop, value]) => {
    map.setPaintProperty(id, prop, value)
  })
  map.setFilter(id, filter)
  map.moveLayer(id)
}

const applySymbolHighlightLayer = (map, id, sourceId, srcLayer, originalLayerId, imageId, filter) => {
  // icon-offset only exists on layers needing anchor precision correction (draw's point-symbol
  // layer) — read off the original layer, omitted when absent.
  const iconOffset = map.getLayoutProperty(originalLayerId, 'icon-offset')
  if (!map.getLayer(id)) {
    map.addLayer({
      id,
      type: 'symbol',
      source: sourceId,
      ...(srcLayer && { 'source-layer': srcLayer }),
      layout: {
        [ICON_IMAGE]: imageId,
        'icon-anchor': map.getLayoutProperty(originalLayerId, 'icon-anchor') ?? 'center',
        ...(iconOffset !== undefined && { 'icon-offset': iconOffset }),
        'icon-allow-overlap': true
      }
    })
  }
  map.setLayoutProperty(id, ICON_IMAGE, imageId)
  if (iconOffset !== undefined) {
    map.setLayoutProperty(id, 'icon-offset', iconOffset)
  }
  map.setFilter(id, filter)
  map.moveLayer(id)
}

const calculateBounds = (LngLatBounds, renderedFeatures) => {
  if (!renderedFeatures.length) {
    return null
  }

  const bounds = new LngLatBounds()

  renderedFeatures.forEach(f => {
    const add = (c) => typeof c[0] === 'number' ? bounds.extend(c) : c.forEach(add)
    add(f.geometry.coordinates)
  })

  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

// Draw's point-symbol layer has a per-feature data-driven icon-image, so there's no single
// shared image id to reverse-map — pointSymbolImages.js precomputes each point's own active/
// selected variant as a property, and the highlight layer just reads that directly.
const applySymbolGeomHighlight = (map, base, sourceId, srcLayer, layerId, filter, getSymbolImageId) => {
  const imageId = map.getLayoutProperty(layerId, ICON_IMAGE)
  if (Array.isArray(imageId)) {
    const property = getSymbolImageId === getActiveImageId ? 'user_symbolActiveImageId' : 'user_symbolSelectedImageId'
    applySymbolHighlightLayer(map, `${base}-symbol`, sourceId, srcLayer, layerId, ['get', property], filter)
    return
  }
  const symbolImageId = getSymbolImageId(map, imageId)
  if (symbolImageId) {
    applySymbolHighlightLayer(map, `${base}-symbol`, sourceId, srcLayer, layerId, symbolImageId, filter)
  }
}

// Always draws a line ring. Only draws a fill when isSelected — active (cursor) features get
// the ring only, so the fill isn't shown for every keyboard-navigated item.
const applyFillGeomHighlight = (map, base, sourceId, srcLayer, { isSelected, idExpression, fillIds, fill, lineColor, lineWidth, filter }) => {
  if (isSelected) {
    const fillIdsArray = []
    fillIds.forEach(id => fillIdsArray.push(id))
    const fillFilter = ['in', idExpression, ['literal', fillIdsArray]]
    // Only apply fill highlight to polygon features, not to any co-selected line features
    applyHighlightLayer(map, `${base}-fill`, 'fill', sourceId, srcLayer, { 'fill-color': fill }, fillFilter)
  }
  applyHighlightLayer(map, `${base}-line`, 'line', sourceId, srcLayer, { 'line-color': lineColor, 'line-width': lineWidth }, filter)
}

const applyFillExtrusionHighlight = (map, base, layerId, { ids, lineColor, lineWidth, idExpression }) => {
  // forEach bypasses broken Set iterator polyfill in the Docusaurus/core-js environment
  const newIds = []
  ids.forEach(id => newIds.push(id))

  const filter = ['in', idExpression, ['literal', newIds]]
  const { source, sourceLayer } = map.getLayer(layerId)

  // A line layer moved to the top of the stack renders above the fill-extrusion 3D pass.
  // fill-extrusion has no outline/stroke property, so this is the only way to show a stroke.
  applyHighlightLayer(map, `${base}-line`, 'line', source, sourceLayer, { 'line-color': lineColor, 'line-width': lineWidth }, filter)
}

const resolveLineStyle = (style, selectedStyle) => ({
  lineColor: selectedStyle ? style.selectionStroke : style.stroke,
  lineWidth: selectedStyle ? style.strokeWidth : style.activeStrokeWidth
})

const applyLineHighlight = (map, base, sourceId, srcLayer, lineColor, lineWidth, filter) => {
  if (map.getLayer(`${base}-fill`)) {
    map.setFilter(`${base}-fill`, ['==', 'id', ''])
  }
  applyHighlightLayer(map, `${base}-line`, 'line', sourceId, srcLayer, { 'line-color': lineColor, 'line-width': lineWidth }, filter)
}

// Orchestrates highlight layers for a single layer. prefix drives which visual style is used:
//   active-highlight        → yellow active ring (stroke only)
//   active-highlight-inner  → black thin ring drawn on top of active
//   selected-highlight      → black thin ring + fill for polygon features
// Only the recorded layerId is registered in stylesMap — falls back to its cold/hot sibling
// (same drawn layer, identical styling) rather than requiring both to be registered. A
// resolved draw-{featureId}-* layer is never itself registered (interactPlugin's config only
// ever has the wildcard 'draw' entry), so that falls back to the wildcard's style instead.
const resolveStyle = (stylesMap, layerId) =>
  stylesMap[layerId] ?? stylesMap[siblingDrawLayerId(layerId)] ??
    (isDrawOwnedLayerId(layerId) ? stylesMap[DRAW_WILDCARD_LAYER_ID] : undefined)

const applyLayerHighlight = (map, layerId, featuresByLayer, stylesMap, prefix, getSymbolImageId) => {
  const { ids, fillIds, idProperty, sourceId, hasFillGeometry } = featuresByLayer[layerId]
  const baseLayer = map.getLayer(layerId)
  const style = resolveStyle(stylesMap, layerId)

  if (!baseLayer || !style) {
    return
  }
  const srcLayer = baseLayer.sourceLayer
  const geom = hasFillGeometry ? 'fill' : baseLayer.type
  const base = `${prefix}-${layerId}`
  const { fill } = style
  const isSelected = prefix === SELECTED_PREFIX
  const selectedStyle = usesSelectedStyle(prefix)
  const { lineColor, lineWidth } = resolveLineStyle(style, selectedStyle)
  const idExpression = idProperty ? ['get', idProperty] : ['id']
  const idsArray = Array.from(ids)
  const filter = ['in', idExpression, ['literal', idsArray]]

  if (baseLayer.type === 'fill-extrusion') {
    applyFillExtrusionHighlight(map, base, layerId, { ids, lineColor, lineWidth, idExpression })
    return
  }

  switch (geom) {
    case 'fill':
      applyFillGeomHighlight(map, base, sourceId, srcLayer, { isSelected, idExpression, fillIds, fill, lineColor, lineWidth, filter })
      break
    case 'line':
      applyLineHighlight(map, base, sourceId, srcLayer, lineColor, lineWidth, filter)
      break
    case 'symbol':
      applySymbolGeomHighlight(map, base, sourceId, srcLayer, layerId, filter, getSymbolImageId)
      break
    default:
      break
  }
}

const applyFeatureHighlights = (map, features, stylesMap, prefix, getSymbolImageId) => {
  const featuresByLayer = groupFeaturesByLayer(map, features)
  const currentLayerIds = new Set(Object.keys(featuresByLayer))
  const storageKey = `_${prefix.replaceAll('-', '')}Sources`
  const previousLayerIds = map[storageKey] || new Set()

  cleanupStaleLayers(map, previousLayerIds, currentLayerIds, prefix)
  map[storageKey] = currentLayerIds
  currentLayerIds.forEach(layerId => applyLayerHighlight(map, layerId, featuresByLayer, stylesMap, prefix, getSymbolImageId))

  return featuresByLayer
}

/**
 * Update highlighted features using pure filters (no cloned sources).
 * activeFeatures (keyboard cursor) render with the active ring (yellow) plus a selected ring inner (black).
 * selectedFeatures render with the selected ring (black) only.
 * Supports fill, line and symbol geometry, multi-source, cleanup, and bounds.
 *
 * @param {object} opts
 * @param {Function} opts.LngLatBounds - MapLibre LngLatBounds constructor
 * @param {object} opts.map - MapLibre map instance
 * @param {Array}  opts.selectedFeatures - committed selection features
 * @param {Array}  opts.activeFeatures   - keyboard-cursor features
 * @param {object} opts.stylesMap        - keyed by layerId; each value is
 *   { stroke, selectionStroke, strokeWidth, activeStrokeWidth, fill }
 * @returns {number[]|null} [west, south, east, north] bounds or null if nothing is selected
 */
export function updateHighlightedFeatures ({ LngLatBounds, map, selectedFeatures, activeFeatures, stylesMap }) {
  if (!map) {
    return null
  }
  // Active cursor features — rendered first so selected layers appear on top
  if (activeFeatures?.length) {
    applyFeatureHighlights(map, activeFeatures, stylesMap, ACTIVE_PREFIX, getActiveImageId)
    // Black selected stroke on top of yellow active (mirrors resolveActive for symbols)
    applyFeatureHighlights(map, activeFeatures, stylesMap, ACTIVE_INNER_PREFIX, getSelectedImageId)
  } else {
    clearPrefixLayers(map, ACTIVE_PREFIX)
    clearPrefixLayers(map, ACTIVE_INNER_PREFIX)
  }

  // Selection features
  let featuresByLayer = {}
  if (selectedFeatures?.length) {
    featuresByLayer = applyFeatureHighlights(map, selectedFeatures, stylesMap, SELECTED_PREFIX, getSelectedImageId)
  } else {
    clearPrefixLayers(map, SELECTED_PREFIX)
  }

  // Bounds only from selected features
  const renderedFeatures = []
  Object.entries(featuresByLayer).forEach(([layerId, { ids, idProperty }]) => {
    renderedFeatures.push(
      ...map
        .queryRenderedFeatures({ layers: [layerId] })
        .filter(f => ids.has(idProperty ? f.properties?.[idProperty] : f.id))
    )
  })

  return calculateBounds(LngLatBounds, renderedFeatures)
}
