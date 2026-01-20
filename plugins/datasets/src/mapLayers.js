import { getValueForStyle } from '../../../src/utils/getValueForStyle.js'

// Generate a hash for consistent source ID generation
const hashString = (str) => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Generate a consistent source ID for source sharing
export const getSourceId = (dataset) => {
  if (dataset.tiles) {
    const tilesKey = Array.isArray(dataset.tiles) ? dataset.tiles.join(',') : dataset.tiles
    return `tiles-${hashString(tilesKey)}`
  }
  if (dataset.data) {
    // URL strings can be shared, inline GeoJSON objects get unique IDs per dataset
    if (typeof dataset.data === 'string') {
      return `geojson-${hashString(dataset.data)}`
    }
    // Inline GeoJSON - use dataset ID since object identity can't be shared
    return `geojson-${dataset.id}`
  }
  // Fallback to dataset ID
  return `source-${dataset.id}`
}

export const addMapLayers = (map, mapStyleId, dataset) => {
  const sourceId = getSourceId(dataset)

  // --- Add source (shared across datasets with same tiles/data URL) ---
  if (!map.getSource(sourceId)) {
    if (dataset.tiles) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: dataset.tiles,
        minzoom: dataset.minZoom || 0,
        maxzoom: dataset.maxZoom || 22
      })
    } else if (dataset.data) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: dataset.data
      })
    }
  }

  // --- Determine layer IDs ---
  const hasFill = !!dataset.fill
  const hasStroke = !!dataset.stroke
  const fillLayerId = hasFill ? dataset.id : null
  const strokeLayerId = hasStroke ? (hasFill ? `${dataset.id}-stroke` : dataset.id) : null
  
  // --- Determie visiblity ---
  const visibility = dataset.visibility === 'hidden' ? 'none' : 'visible'

  // --- Add fill layer ---
  if (hasFill && !map.getLayer(fillLayerId)) {
    const fillColor = getValueForStyle(dataset.fill, mapStyleId)
    map.addLayer({
      id: fillLayerId,
      type: 'fill',
      source: sourceId,
      'source-layer': dataset.sourceLayer,
      layout: {
        visibility
      },
      paint: {
        'fill-color': fillColor,
        'fill-opacity': dataset.opacity || 1
      },
      ...(dataset.filter ? { filter: dataset.filter } : {})
    })
  }

  // --- Add stroke layer ---
  if (hasStroke && !map.getLayer(strokeLayerId)) {
    const strokeColor = getValueForStyle(dataset.stroke, mapStyleId)
    map.addLayer({
      id: strokeLayerId,
      type: 'line',
      source: sourceId,
      'source-layer': dataset.sourceLayer,
      layout: {
        visibility
      },
      paint: {
        'line-color': strokeColor,
        'line-width': dataset.strokeWidth || 1,
        'line-opacity': dataset.opacity || 1,
        ...(dataset.strokeDashArray ? { 'line-dasharray': dataset.strokeDashArray } : {})
      },
      ...(dataset.filter ? { filter: dataset.filter } : {})
    })
  }
}