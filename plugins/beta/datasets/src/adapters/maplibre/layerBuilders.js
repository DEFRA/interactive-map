import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { getLayerIds } from './layerIds.js'
import { getSymbolAnchor } from './symbolImages.js'

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

export const addFillLayer = (map, registryDataset, mapStyleId, patternRegistry, pixelRatio = 1) => {
  const { hasFill, fillLayerId } = registryDataset
  if (!(hasFill && fillLayerId) || map.getLayer(fillLayerId)) {
    return
  }
  const patternImageId = patternRegistry.getPatternImageId(registryDataset.style, mapStyleId, pixelRatio)
  const paint = patternImageId
    ? { 'fill-pattern': patternImageId, 'fill-opacity': registryDataset.opacity || 1 }
    : { 'fill-color': getValueForStyle(registryDataset.style.fill, mapStyleId), 'fill-opacity': registryDataset.opacity || 1 }
  map.addLayer(registryDataset.getFillSource(paint))
}

// ─── Stroke layer ─────────────────────────────────────────────────────────────

export const addStrokeLayer = (map, registryDataset, mapStyleId) => {
  const { hasStroke, strokeLayerId } = registryDataset

  if (!hasStroke || map.getLayer(strokeLayerId)) {
    return
  }
  const paint = {
    'line-color': getValueForStyle(registryDataset.style.stroke, mapStyleId),
    'line-width': registryDataset.style.strokeWidth || 1,
    'line-opacity': registryDataset.opacity || 1,
    ...(registryDataset.style.strokeDashArray ? { 'line-dasharray': registryDataset.style.strokeDashArray } : {})
  }
  map.addLayer(registryDataset.getStrokeSource(paint))
}

// ─── Symbol layer ─────────────────────────────────────────────────────────────

export const addSymbolLayer = (map, registryDataset, mapStyle, symbolRegistry, pixelRatio) => {
  const { hasSymbol, symbolLayerId } = registryDataset
  if (!hasSymbol || !symbolRegistry || !symbolLayerId || map.getLayer(symbolLayerId)) { return }
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
  addSymbolLayer(map, registryDataset, mapStyle, symbolRegistry, pixelRatio)
  addFillLayer(map, registryDataset, mapStyleId, patternRegistry, pixelRatio)
  addStrokeLayer(map, registryDataset, mapStyleId)
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

  addSymbolLayer(map, registryDataset, mapStyle, symbolRegistry, pixelRatio)
  addFillLayer(map, registryDataset, mapStyleId, patternRegistry, pixelRatio)
  addStrokeLayer(map, registryDataset, mapStyleId)
  return sourceId
}
