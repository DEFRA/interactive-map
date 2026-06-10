const ICON_IMAGE = 'icon-image'

const ACTIVE_PREFIX = 'active-highlight'
const ACTIVE_INNER_PREFIX = 'active-highlight-inner'
const SELECTED_PREFIX = 'selected-highlight'

// Inner and selected both use the selected colour/width (black, thin)
const usesSelectedStyle = (prefix) => prefix === SELECTED_PREFIX || prefix === ACTIVE_INNER_PREFIX

const getActiveImageId = (map, imageId) => map._activeSymbolImageMap?.[imageId] ?? null
const getSelectedImageId = (map, imageId) => map._selectedSymbolImageMap?.[imageId] ?? null

const groupFeaturesBySource = (map, selectedFeatures) => {
  const featuresBySource = {}

  selectedFeatures?.forEach(({ featureId, layerId, idProperty, geometry }) => {
    const layer = map.getLayer(layerId)

    if (!layer) {
      return
    }

    const sourceId = layer.source

    if (!featuresBySource[sourceId]) {
      featuresBySource[sourceId] = {
        ids: new Set(),
        fillIds: new Set(),
        idProperty,
        layerId,
        hasFillGeometry: false
      }
    }

    // Track whether any feature on this source is a polygon
    if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
      featuresBySource[sourceId].hasFillGeometry = true
      featuresBySource[sourceId].fillIds.add(featureId)
    }

    featuresBySource[sourceId].ids.add(featureId)
  })

  return featuresBySource
}

const cleanupStaleSources = (map, previousSources, currentSources, prefix) => {
  previousSources.forEach(src => {
    if (!currentSources.has(src)) {
      const base = `${prefix}-${src}`
      ;[`${base}-fill`, `${base}-line`, `${base}-symbol`].forEach(id => {
        if (map.getLayer(id)) {
          map.setFilter(id, ['==', 'id', ''])
        }
      })
    }
  })
}

const clearPrefixSources = (map, prefix) => {
  const key = `_${prefix.replaceAll('-', '')}Sources`
  cleanupStaleSources(map, map[key] || new Set(), new Set(), prefix)
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
  if (!map.getLayer(id)) {
    map.addLayer({
      id,
      type: 'symbol',
      source: sourceId,
      ...(srcLayer && { 'source-layer': srcLayer }),
      layout: {
        [ICON_IMAGE]: imageId,
        'icon-anchor': map.getLayoutProperty(originalLayerId, 'icon-anchor') ?? 'center',
        'icon-allow-overlap': true
      }
    })
  }
  map.setLayoutProperty(id, ICON_IMAGE, imageId)
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

const applySymbolGeomHighlight = (map, base, sourceId, srcLayer, layerId, filter, getSymbolImageId) => {
  const imageId = map.getLayoutProperty(layerId, ICON_IMAGE)
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

const applySymbolHighlight = (map, base, sourceId, srcLayer, layerId, filter, getSymbolImageId) => {
  applySymbolGeomHighlight(map, base, sourceId, srcLayer, layerId, filter, getSymbolImageId)
}

// Orchestrates highlight layers for a single source. prefix drives which visual style is used:
//   active-highlight        → yellow active ring (stroke only)
//   active-highlight-inner  → black thin ring drawn on top of active
//   selected-highlight      → black thin ring + fill for polygon features
const applySourceHighlight = (map, sourceId, featuresBySource, stylesMap, prefix, getSymbolImageId) => {
  const { ids, fillIds, idProperty, layerId, hasFillGeometry } = featuresBySource[sourceId]
  const baseLayer = map.getLayer(layerId)

  if (!baseLayer || !stylesMap[layerId]) {
    return
  }

  const style = stylesMap[layerId]
  const srcLayer = baseLayer.sourceLayer
  const geom = hasFillGeometry ? 'fill' : baseLayer.type
  const base = `${prefix}-${sourceId}`
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
      applySymbolHighlight(map, base, sourceId, srcLayer, layerId, filter, getSymbolImageId)
      break
    default:
      break
  }
}

const applyFeatureHighlights = (map, features, stylesMap, prefix, getSymbolImageId) => {
  const featuresBySource = groupFeaturesBySource(map, features)
  const currentSources = new Set(Object.keys(featuresBySource))
  const storageKey = `_${prefix.replaceAll('-', '')}Sources`
  const previousSources = map[storageKey] || new Set()

  cleanupStaleSources(map, previousSources, currentSources, prefix)
  map[storageKey] = currentSources
  currentSources.forEach(sourceId => applySourceHighlight(map, sourceId, featuresBySource, stylesMap, prefix, getSymbolImageId))

  return featuresBySource
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
    clearPrefixSources(map, ACTIVE_PREFIX)
    clearPrefixSources(map, ACTIVE_INNER_PREFIX)
  }

  // Selection features
  let featuresBySource = {}
  if (selectedFeatures?.length) {
    featuresBySource = applyFeatureHighlights(map, selectedFeatures, stylesMap, SELECTED_PREFIX, getSelectedImageId)
  } else {
    clearPrefixSources(map, SELECTED_PREFIX)
  }

  // Bounds only from selected features
  const renderedFeatures = []
  Object.entries(featuresBySource).forEach(([, { ids, idProperty, layerId }]) => {
    renderedFeatures.push(
      ...map
        .queryRenderedFeatures({ layers: [layerId] })
        .filter(f => ids.has(idProperty ? f.properties?.[idProperty] : f.id))
    )
  })

  return calculateBounds(LngLatBounds, renderedFeatures)
}
