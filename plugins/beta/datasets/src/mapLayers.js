import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

// Generate a hash for consistent source ID generation
const hashString = (str) => {
  const HASH_BASE = 36
  let hash = 0
  for (const ch of str) {
    hash = ((hash << 5) - hash) + ch.codePointAt(0)
    hash = hash & hash
  }
  return Math.abs(hash).toString(HASH_BASE)
}

// Generate a consistent source ID for source sharing
const getSourceId = (dataset) => {
  if (dataset.tiles) {
    const tilesKey = Array.isArray(dataset.tiles) ? dataset.tiles.join(',') : dataset.tiles
    return `tiles-${hashString(tilesKey)}`
  }
  if (dataset.geojson) {
    // Dynamic sources get unique IDs per dataset (no sharing)
    if (isDynamicSource(dataset)) {
      return `geojson-dynamic-${dataset.id}`
    }
    // URL strings can be shared, inline GeoJSON objects get unique IDs per dataset
    if (typeof dataset.geojson === 'string') {
      return `geojson-${hashString(dataset.geojson)}`
    }
    // Inline GeoJSON - use dataset ID since object identity can't be shared
    return `geojson-${dataset.id}`
  }
  // Fallback to dataset ID
  return `source-${dataset.id}`
}

/**
 * Check if a dataset uses dynamic fetching (bbox-based)
 * Dynamic sources require: URL geojson, idProperty for deduplication, and transformRequest for URL building
 * @param {Object} dataset
 * @returns {boolean}
 */
const isDynamicSource = (dataset) => {
  return (
    typeof dataset.geojson === 'string' &&
    !!dataset.idProperty &&
    typeof dataset.transformRequest === 'function'
  )
}

/**
 * Update the data for a GeoJSON source
 * @param {Object} map - Map instance
 * @param {string} sourceId - Source ID
 * @param {Object} geojson - GeoJSON FeatureCollection
 */
const updateSourceData = (map, sourceId, geojson) => {
  const source = map.getSource(sourceId)
  if (source && typeof source.setData === 'function') {
    source.setData(geojson)
  }
}

/**
 * Get all layer IDs that use a given source
 * @param {string} sourceId
 * @returns {string[]} Array of layer IDs using the source
 */
const getLayersUsingSource = (map, sourceId) => {
  const style = map.getStyle()
  if (!style?.layers) {
    return []
  }

  return style.layers
    .filter(layer => layer.source === sourceId)
    .map(layer => layer.id)
}

const addMapLayers = (map, mapStyleId, dataset) => {
  const sourceId = getSourceId(dataset)

  // --- Add source (shared across datasets with same tiles/data URL) ---
  if (!map.getSource(sourceId)) {

    if (dataset.tiles) {
      // Tiles
      map.addSource(sourceId, {
        type: 'vector',
        tiles: dataset.tiles,
        minzoom: dataset.minZoom || 0,
        maxzoom: dataset.maxZoom || 22
      })
    } else if (dataset.geojson) {
      // Dynamic source - start with empty FeatureCollection, will be populated by createDynamicSource
      // Static source - use URL or inline GeoJSON directly
      const initialData = isDynamicSource(dataset)
        ? { type: 'FeatureCollection', features: [] }
        : dataset.geojson

      map.addSource(sourceId, {
        type: 'geojson',
        data: initialData
      })
    } else {
      // No action
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
      'source-layer': dataset?.tiles?.length ? dataset.sourceLayer : undefined,
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
      'source-layer': dataset?.tiles?.length ? dataset.sourceLayer : undefined,
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

export {
  getSourceId,
  getLayersUsingSource,
  addMapLayers,
  isDynamicSource,
  updateSourceData
}