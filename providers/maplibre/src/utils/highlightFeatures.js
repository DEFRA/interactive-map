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

    // Track whether any selected feature on this source is a polygon
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

const applyHighlightLayer = (map, id, type, sourceId, srcLayer, paint, filter) => {
  if (!map.getLayer(id)) {
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
        'icon-image': imageId,
        'icon-anchor': map.getLayoutProperty(originalLayerId, 'icon-anchor') ?? 'center',
        'icon-allow-overlap': true
      }
    })
  }
  map.setLayoutProperty(id, 'icon-image', imageId)
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

const getActiveImageId = (map, imageId) => map._activeSymbolImageMap?.[imageId] ?? null
const getSelectedImageId = (map, imageId) => map._selectedSymbolImageMap?.[imageId] ?? null

const SELECTED_PREFIX = 'selected-highlight'

const applyFeatureHighlights = (map, features, stylesMap, prefix, getSymbolImageId) => {
  const featuresBySource = groupFeaturesBySource(map, features)
  const currentSources = new Set(Object.keys(featuresBySource))
  const storageKey = `_${prefix.replaceAll('-', '')}Sources`
  const previousSources = map[storageKey] || new Set()

  cleanupStaleSources(map, previousSources, currentSources, prefix)
  map[storageKey] = currentSources

  currentSources.forEach(sourceId => {
    const { ids, fillIds, idProperty, layerId, hasFillGeometry } = featuresBySource[sourceId]
    const baseLayer = map.getLayer(layerId)
    const srcLayer = baseLayer.sourceLayer
    const geom = hasFillGeometry ? 'fill' : baseLayer.type
    const base = `${prefix}-${sourceId}`
    const { stroke, selectionStroke, strokeWidth, fill } = stylesMap[layerId]
    const lineColor = prefix === SELECTED_PREFIX ? selectionStroke : stroke

    const idExpression = idProperty ? ['get', idProperty] : ['id']
    const filter = ['in', idExpression, ['literal', [...ids]]]

    if (geom === 'fill') {
      const fillFilter = ['in', idExpression, ['literal', [...fillIds]]]
      // Only apply fill highlight to polygon features, not to any co-selected line features
      applyHighlightLayer(map, `${base}-fill`, 'fill', sourceId, srcLayer, { 'fill-color': fill }, fillFilter)
      applyHighlightLayer(map, `${base}-line`, 'line', sourceId, srcLayer, { 'line-color': lineColor, 'line-width': strokeWidth }, filter)
    }

    if (geom === 'line') {
      // Clear any fill highlight from a previous polygon on the same source
      if (map.getLayer(`${base}-fill`)) {
        map.setFilter(`${base}-fill`, ['==', 'id', ''])
      }
      applyHighlightLayer(map, `${base}-line`, 'line', sourceId, srcLayer, { 'line-color': lineColor, 'line-width': strokeWidth }, filter)
    }

    if (geom === 'symbol') {
      const imageId = map.getLayoutProperty(layerId, 'icon-image')
      const symbolImageId = getSymbolImageId(map, imageId)
      if (symbolImageId) {
        applySymbolHighlightLayer(map, `${base}-symbol`, sourceId, srcLayer, layerId, symbolImageId, filter)
      }
    }
  })

  return featuresBySource
}

/**
 * Update highlighted features using pure filters.
 * activeFeatures (keyboard cursor) render with the active ring (yellow); selectedFeatures with the selected ring (black).
 * Supports fill, line and symbol geometry, multi-source, cleanup, and bounds.
 */
export function updateHighlightedFeatures ({ LngLatBounds, map, selectedFeatures, activeFeatures, stylesMap }) {
  if (!map) {
    return null
  }

  // Active cursor features — rendered first so selected layers appear on top
  if (activeFeatures?.length) {
    applyFeatureHighlights(map, activeFeatures, stylesMap, 'highlight', getActiveImageId)
  } else {
    cleanupStaleSources(map, map._highlightSources || new Set(), new Set(), 'highlight')
    map._highlightSources = new Set()
  }

  // Committed selection features
  const featuresBySource = selectedFeatures?.length
    ? applyFeatureHighlights(map, selectedFeatures, stylesMap, SELECTED_PREFIX, getSelectedImageId)
    : (() => {
        cleanupStaleSources(map, map._selectedhighlightSources || new Set(), new Set(), SELECTED_PREFIX)
        map._selectedhighlightSources = new Set()
        return {}
      })()

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
