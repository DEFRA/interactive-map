import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { hasPattern } from './patternImages.js'
import { getLayerIds } from './layerIds.js'
import { getSymbolAnchor, anchorToMaplibre } from './symbolImages.js'

// ─── Source ───────────────────────────────────────────────────────────────────

// export const addSource = (map, dataset, sourceId) => {
//   if (map.getSource(sourceId)) {
//     return
//   }
//   if (dataset.tiles) {
//     map.addSource(sourceId, {
//       type: 'vector',
//       tiles: dataset.tiles,
//       minzoom: dataset.minZoom || 0,
//       maxzoom: dataset.maxZoom || MAX_TILE_ZOOM
//     })
//     return
//   }
//   if (dataset.geojson) {
//     const initialData = isDynamicSource(dataset)
//       ? { type: 'FeatureCollection', features: [] }
//       : dataset.geojson
//     map.addSource(sourceId, { type: 'geojson', data: initialData, generateId: true })
//   }
// }

// ─── Fill layer ───────────────────────────────────────────────────────────────

export const addFillLayer = (map, config, layerId, sourceId, sourceLayer, visibility, { mapStyleId, patternRegistry, pixelRatio = 1 }) => {
  if (!layerId || map.getLayer(layerId)) {
    return
  }
  if (!config.fill && !hasPattern(config)) {
    return
  }
  const patternImageId = hasPattern(config) ? patternRegistry.getPatternImageId(config, mapStyleId, pixelRatio) : null
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

export const addSymbolLayer = (map, registryDataset, mapStyle, symbolRegistry, pixelRatio) => {
  const { symbolLayerId } = registryDataset
  if (!symbolLayerId || map.getLayer(symbolLayerId)) { return }
  const symbolDef = symbolRegistry.getSymbolDef(registryDataset.style)
  if (!symbolDef) { return }
  const imageId = symbolRegistry.getSymbolImageId(registryDataset.style, mapStyle, false, pixelRatio)
  if (!imageId) { return }
  const anchor = getSymbolAnchor(registryDataset.style, symbolDef)
  map.addLayer(registryDataset.getSymbolSource(imageId, anchor, symbolDef))
}

// ─── Dataset layers ───────────────────────────────────────────────────────────

export const addSublayerLayers = (map, registryDataset, sourceId, sourceLayer, { mapStyle, symbolRegistry, patternRegistry, pixelRatio }) => {
  const mapStyleId = mapStyle.id
  const merged = { id: registryDataset.id, minZoom: registryDataset.minZoom, maxZoom: registryDataset.maxZoom, filter: registryDataset.filter, ...registryDataset.style }
  const { fillLayerId, strokeLayerId } = getLayerIds({ id: registryDataset.id, ...registryDataset.style })
  const parentHidden = false // TODO - fix visibility dataset.visibility === 'hidden'
  const sublayerHidden = registryDataset.visibility === 'hidden'
  const visibility = (parentHidden || sublayerHidden) ? 'none' : 'visible'
  if (registryDataset.hasSymbol && symbolRegistry) {
    addSymbolLayer(map, registryDataset, mapStyle, symbolRegistry, pixelRatio)
    return
  }
  addFillLayer(map, merged, fillLayerId, sourceId, sourceLayer, visibility, { mapStyleId, patternRegistry, pixelRatio })
  addStrokeLayer(map, merged, strokeLayerId, sourceId, sourceLayer, visibility, mapStyleId)
}

/**
 * Add all layers (and source if needed) for a dataset.
 * Returns the sourceId so the caller can track the datasetId → sourceId mapping.
 * @param {Object} map - MapLibre map instance
 * @param {Object} registryDataset
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} [symbolRegistry]
 * @param {Object} [patternRegistry]
 * @param {number} [pixelRatio] - Device pixel ratio × map size scale factor
 * @returns {string} sourceId
 */
export const addDatasetLayers = (map, registryDataset, mapStyle, symbolRegistry, patternRegistry, pixelRatio) => {
  const mapStyleId = mapStyle.id
  const { sourceId, source, sourceLayer } = registryDataset
  if (source && !map.getSource(sourceId)) {
    map.addSource(sourceId, source)
  }

  if (registryDataset.sublayers?.length) {
    registryDataset.sublayers.forEach(sublayer => {
      addSublayerLayers(map, sublayer, sourceId, sourceLayer, { mapStyle, symbolRegistry, patternRegistry, pixelRatio })
    })
    return sourceId
  }

  if (registryDataset.isSublayer) {
    return undefined
  }
  const visibility = registryDataset.visibility === 'hidden' ? 'none' : 'visible'

  if (registryDataset.hasSymbol && symbolRegistry) {
    addSymbolLayer(map, registryDataset, mapStyle, symbolRegistry, pixelRatio)
    return sourceId
  }

  const config = { minZoom: registryDataset.minZoom, maxZoom: registryDataset.maxZoom, filter: registryDataset.filter, ...registryDataset.style }
  addFillLayer(map, config, registryDataset.fillLayerId, sourceId, sourceLayer, visibility, { mapStyleId, patternRegistry, pixelRatio })
  addStrokeLayer(map, config, registryDataset.strokeLayerId, sourceId, sourceLayer, visibility, mapStyleId)
  return sourceId
}
