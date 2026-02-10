/**
 * Update highlighted features using pure filters.
 * Supports fill + line geometry, multi-source, cleanup, and bounds.
 */
function updateHighlightedFeatures({ LngLatBounds, map, selectedFeatures, stylesMap }) {
  if (!map) {
    return null
  }

  const featuresBySource = {}
  const renderedFeatures = []

  // Group features by source
  selectedFeatures?.forEach(({ featureId, layerId, idProperty }) => {
    const layer = map.getLayer(layerId)

    if (!layer) {
      return
    }

    const sourceId = layer.source

    if (!featuresBySource[sourceId]) {
      featuresBySource[sourceId] = {
        ids: new Set(),
        idProperty,
        layerId
      }
    }
    featuresBySource[sourceId].ids.add(featureId)
  })

  const currentSources = new Set(Object.keys(featuresBySource))
  const previousSources = map._highlightedSources || new Set()

  // Cleanup for sources no longer selected
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

  map._highlightedSources = currentSources

  // Apply highlights for current sources
  currentSources.forEach(sourceId => {
    const { ids, idProperty, layerId } = featuresBySource[sourceId]
    const baseLayer = map.getLayer(layerId)
    const srcLayer = baseLayer.sourceLayer
    const geom = baseLayer.type
    const base = `highlight-${sourceId}`

    const { stroke, strokeWidth, fill } = stylesMap[layerId]
    // Use ['id'] for feature.id, ['get', idProperty] for properties
    const idExpression = idProperty ? ['get', idProperty] : ['id']
    const filter = ['in', idExpression, ['literal', [...ids]]]

    // Ensure layers
    if (geom === 'fill') {
      if (!map.getLayer(`${base}-fill`)) {
        map.addLayer({
          id: `${base}-fill`,
          type: 'fill',
          source: sourceId,
          ...(srcLayer && { 'source-layer': srcLayer }),
          paint: { 'fill-color': fill }
        })
      }
      map.setPaintProperty(`${base}-fill`, 'fill-color', fill)
      map.setFilter(`${base}-fill`, filter)
      if (!map.getLayer(`${base}-line`)) {
        map.addLayer({
          id: `${base}-line`,
          type: 'line',
          source: sourceId,
          ...(srcLayer && { 'source-layer': srcLayer }),
          paint: { 'line-color': stroke, 'line-width': strokeWidth }
        })
      }
      map.setPaintProperty(`${base}-line`, 'line-color', stroke)
      map.setPaintProperty(`${base}-line`, 'line-width', strokeWidth)
      map.setFilter(`${base}-line`, filter)
    }

    if (geom === 'line') {
      // Clear any fill highlight from a previous polygon selection on the same source
      if (map.getLayer(`${base}-fill`)) {
        map.setFilter(`${base}-fill`, ['==', 'id', ''])
      }
      if (!map.getLayer(`${base}-line`)) {
        map.addLayer({
          id: `${base}-line`,
          type: 'line',
          source: sourceId,
          ...(srcLayer && { 'source-layer': srcLayer }),
          paint: { 'line-color': stroke, 'line-width': strokeWidth }
        })
      }
      map.setPaintProperty(`${base}-line`, 'line-color', stroke)
      map.setPaintProperty(`${base}-line`, 'line-width', strokeWidth)
      map.setFilter(`${base}-line`, filter)
    }

    // Bounds only from rendered tiles
    renderedFeatures.push(
      ...map
        .queryRenderedFeatures({ layers: [layerId] })
        .filter(f => ids.has(idProperty ? f.properties?.[idProperty] : f.id))
    )
  })

  // Calculate bounds
  if (!renderedFeatures.length) {
    return null
  }

  let bounds = new LngLatBounds()
  renderedFeatures.forEach(f => {
    const add = (c) => typeof c[0] === 'number' ? bounds.extend(c) : c.forEach(add)
    add(f.geometry.coordinates)
  })

  return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
}

export { updateHighlightedFeatures }
