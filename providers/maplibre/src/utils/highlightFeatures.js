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
        idProperty,
        layerId,
        hasFillGeometry: false
      }
    }

    // Track whether any selected feature on this source is a polygon
    if (geometry && (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon')) {
      featuresBySource[sourceId].hasFillGeometry = true
    }

    featuresBySource[sourceId].ids.add(featureId)
  })

  return featuresBySource
}

const cleanupStaleSources = (map, previousSources, currentSources) => {
  previousSources.forEach(src => {
    if (!currentSources.has(src)) {
      const base = `highlight-${src}`
      const layers = [`${base}-fill`, `${base}-line`]
      layers.forEach(id => {
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

/**
 * Update highlighted features using pure filters.
 * Supports fill + line geometry, multi-source, cleanup, and bounds.
 */
export function updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures, stylesMap }) {
  if (!map) {
    return null
  }

  const featuresBySource = groupFeaturesBySource(map, selectedFeatures)
  const renderedFeatures = []

  const currentSources = new Set(Object.keys(featuresBySource))
  const previousSources = map._highlightedSources || new Set()

  cleanupStaleSources(map, previousSources, currentSources)
  map._highlightedSources = currentSources

  // Apply highlights for current sources
  currentSources.forEach(sourceId => {
    const { ids, idProperty, layerId, hasFillGeometry } = featuresBySource[sourceId]
    const baseLayer = map.getLayer(layerId)
    const srcLayer = baseLayer.sourceLayer

    // Use the actual feature geometry to determine highlight type
    const geom = hasFillGeometry ? 'fill' : baseLayer.type
    const base = `highlight-${sourceId}`

    const { stroke, strokeWidth, fill } = stylesMap[layerId]
    // Use ['id'] for feature.id, ['get', idProperty] for properties
    const idExpression = idProperty ? ['get', idProperty] : ['id']
    const filter = ['in', idExpression, ['literal', [...ids]]]

    const linePaint = { 'line-color': stroke, 'line-width': strokeWidth }

    if (geom === 'fill') {
      applyHighlightLayer(map, `${base}-fill`, 'fill', sourceId, srcLayer, { 'fill-color': fill }, filter)
      applyHighlightLayer(map, `${base}-line`, 'line', sourceId, srcLayer, linePaint, filter)
    }

    if (geom === 'line') {
      // Clear any fill highlight from a previous polygon selection on the same source
      if (map.getLayer(`${base}-fill`)) {
        map.setFilter(`${base}-fill`, ['==', 'id', ''])
      }
      applyHighlightLayer(map, `${base}-line`, 'line', sourceId, srcLayer, linePaint, filter)
    }

    // Bounds only from rendered tiles
    renderedFeatures.push(
      ...map
        .queryRenderedFeatures({ layers: [layerId] })
        .filter(f => ids.has(idProperty ? f.properties?.[idProperty] : f.id))
    )
  })

  return calculateBounds(LngLatBounds, renderedFeatures)
}
