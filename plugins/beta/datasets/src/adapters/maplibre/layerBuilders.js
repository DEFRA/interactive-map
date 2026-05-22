import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { getSymbolAnchor } from './symbolImages.js'

// ─── Fill layer ───────────────────────────────────────────────────────────────

export const addFillLayer = (map, registryDataset, mapStyleId, patternRegistry, pixelRatio = 1) => {
  const { hasFill, fillLayerId } = registryDataset
  if (!(hasFill && fillLayerId) || map.getLayer(fillLayerId)) {
    return
  }
  const patternImageId = patternRegistry.getPatternImageId(registryDataset.style, mapStyleId, pixelRatio)
  const paint = patternImageId
    ? { 'fill-pattern': patternImageId, 'fill-opacity': registryDataset.opacity }
    : { 'fill-color': getValueForStyle(registryDataset.style.fill, mapStyleId), 'fill-opacity': registryDataset.opacity }
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
    'line-opacity': registryDataset.opacity,
    ...(registryDataset.style.strokeDashArray ? { 'line-dasharray': registryDataset.style.strokeDashArray } : {})
  }
  const strokeSource = registryDataset.getStrokeSource(paint)
  map.addLayer(strokeSource)
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

/**
 * Add all layers (and source if needed) for a dataset.
 * Returns the sourceId so the caller can track the datasetId → sourceId mapping.
 * @param {Object} map - MapLibre map instance
 * @param {Object} registryDataset
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} symbolRegistry
 * @param {Object} patternRegistry
 * @param {number} pixelRatio - Device pixel ratio × map size scale factor
 * @returns {string} sourceId
 */
export const addDatasetLayers = (map, registryDataset, mapStyle, symbolRegistry, patternRegistry, pixelRatio) => {
  const { sourceId, source } = registryDataset
  if (source && !map.getSource(sourceId)) {
    map.addSource(sourceId, source)
  }
  const mapStyleId = mapStyle.id
  addSymbolLayer(map, registryDataset, mapStyle, symbolRegistry, pixelRatio)
  addFillLayer(map, registryDataset, mapStyleId, patternRegistry, pixelRatio)
  addStrokeLayer(map, registryDataset, mapStyleId)

  if (registryDataset.sublayers?.length) {
    registryDataset.sublayers.forEach(sublayer => {
      addDatasetLayers(map, sublayer, mapStyle, symbolRegistry, patternRegistry, pixelRatio)
    })
    return sourceId
  }

  if (registryDataset.isSublayer) {
    return undefined
  }
  return sourceId
}
