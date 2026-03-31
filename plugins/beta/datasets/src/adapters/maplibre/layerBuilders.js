import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { hasPattern, getPatternImageId } from '../../styles/patterns.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'
import { getSourceId, getLayerIds, getSublayerLayerIds, isDynamicSource, MAX_TILE_ZOOM } from './layerIds.js'
import { hasSymbol, getSymbolDef, getSymbolAnchor, anchorToMaplibre, getSymbolImageId } from './symbolImages.js'

// ─── Source ───────────────────────────────────────────────────────────────────

export const addSource = (map, dataset, sourceId) => {
  if (map.getSource(sourceId)) {
    return
  }
  if (dataset.tiles) {
    map.addSource(sourceId, {
      type: 'vector',
      tiles: dataset.tiles,
      minzoom: dataset.minZoom || 0,
      maxzoom: dataset.maxZoom || MAX_TILE_ZOOM
    })
    return
  }
  if (dataset.geojson) {
    const initialData = isDynamicSource(dataset)
      ? { type: 'FeatureCollection', features: [] }
      : dataset.geojson
    map.addSource(sourceId, { type: 'geojson', data: initialData, generateId: true })
  }
}

// ─── Fill layer ───────────────────────────────────────────────────────────────

export const addFillLayer = (map, config, layerId, sourceId, sourceLayer, visibility, mapStyleId) => {
  if (!layerId || map.getLayer(layerId)) {
    return
  }
  if (!config.fill && !hasPattern(config)) {
    return
  }
  const patternImageId = hasPattern(config) ? getPatternImageId(config, mapStyleId) : null
  const paint = patternImageId
    ? { 'fill-pattern': patternImageId, 'fill-opacity': config.opacity || 1 }
    : { 'fill-color': getValueForStyle(config.fill, mapStyleId), 'fill-opacity': config.opacity || 1 }
  map.addLayer({
    id: layerId,
    type: 'fill',
    source: sourceId,
    'source-layer': sourceLayer,
    minzoom: config.minZoom,
    maxzoom: config.maxZoom,
    layout: { visibility },
    paint,
    ...(config.filter ? { filter: config.filter } : {})
  })
}

// ─── Stroke layer ─────────────────────────────────────────────────────────────

export const addStrokeLayer = (map, config, layerId, sourceId, sourceLayer, visibility, mapStyleId) => {
  if (!layerId || !config.stroke || map.getLayer(layerId)) {
    return
  }
  map.addLayer({
    id: layerId,
    type: 'line',
    source: sourceId,
    'source-layer': sourceLayer,
    minzoom: config.minZoom,
    maxzoom: config.maxZoom,
    layout: { visibility },
    paint: {
      'line-color': getValueForStyle(config.stroke, mapStyleId),
      'line-width': config.strokeWidth || 1,
      'line-opacity': config.opacity || 1,
      ...(config.strokeDashArray ? { 'line-dasharray': config.strokeDashArray } : {})
    },
    ...(config.filter ? { filter: config.filter } : {})
  })
}

// ─── Symbol layer ─────────────────────────────────────────────────────────────

export const addSymbolLayer = (map, dataset, layerId, sourceId, sourceLayer, visibility, { mapStyleId, symbolRegistry }) => {
  if (!layerId || map.getLayer(layerId)) { return }
  const symbolDef = getSymbolDef(dataset, symbolRegistry)
  if (!symbolDef) { return }
  const imageId = getSymbolImageId(dataset, mapStyleId, symbolRegistry, false)
  if (!imageId) { return }
  const anchor = getSymbolAnchor(dataset, symbolDef)
  map.addLayer({
    id: layerId,
    type: 'symbol',
    source: sourceId,
    'source-layer': sourceLayer,
    minzoom: dataset.minZoom,
    maxzoom: dataset.maxZoom,
    layout: {
      visibility,
      'icon-image': imageId,
      'icon-anchor': anchorToMaplibre(anchor),
      'icon-allow-overlap': true
    },
    ...(dataset.filter ? { filter: dataset.filter } : {})
  })
}

// ─── Dataset layers ───────────────────────────────────────────────────────────

export const addSublayerLayers = (map, dataset, sublayer, sourceId, sourceLayer, mapStyleId, symbolRegistry) => {
  const merged = mergeSublayer(dataset, sublayer)
  const { fillLayerId, strokeLayerId, symbolLayerId } = getSublayerLayerIds(dataset.id, sublayer.id)
  const parentHidden = dataset.visibility === 'hidden'
  const sublayerHidden = dataset.sublayerVisibility?.[sublayer.id] === 'hidden'
  const visibility = (parentHidden || sublayerHidden) ? 'none' : 'visible'
  if (hasSymbol(merged) && symbolRegistry) {
    addSymbolLayer(map, merged, symbolLayerId, sourceId, sourceLayer, visibility, { mapStyleId, symbolRegistry })
    return
  }
  addFillLayer(map, merged, fillLayerId, sourceId, sourceLayer, visibility, mapStyleId)
  addStrokeLayer(map, merged, strokeLayerId, sourceId, sourceLayer, visibility, mapStyleId)
}

/**
 * Add all layers (and source if needed) for a dataset.
 * Returns the sourceId so the caller can track the datasetId → sourceId mapping.
 * @param {Object} map - MapLibre map instance
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @param {Object} [symbolRegistry]
 * @returns {string} sourceId
 */
export const addDatasetLayers = (map, dataset, mapStyleId, symbolRegistry) => {
  const sourceId = getSourceId(dataset)
  addSource(map, dataset, sourceId)

  const sourceLayer = dataset.tiles?.length ? dataset.sourceLayer : undefined

  if (dataset.sublayers?.length) {
    dataset.sublayers.forEach(sublayer => {
      addSublayerLayers(map, dataset, sublayer, sourceId, sourceLayer, mapStyleId, symbolRegistry)
    })
    return sourceId
  }

  const { fillLayerId, strokeLayerId, symbolLayerId } = getLayerIds(dataset)
  const visibility = dataset.visibility === 'hidden' ? 'none' : 'visible'

  if (hasSymbol(dataset) && symbolRegistry) {
    addSymbolLayer(map, dataset, symbolLayerId, sourceId, sourceLayer, visibility, { mapStyleId, symbolRegistry })
    return sourceId
  }

  addFillLayer(map, dataset, fillLayerId, sourceId, sourceLayer, visibility, mapStyleId)
  addStrokeLayer(map, dataset, strokeLayerId, sourceId, sourceLayer, visibility, mapStyleId)
  return sourceId
}
