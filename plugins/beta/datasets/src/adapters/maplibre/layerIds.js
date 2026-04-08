import { hasPattern } from '../../../../../../src/utils/patternUtils.js'

// ─── Internal helpers ─────────────────────────────────────────────────────────

const hasSymbol = (dataset) => !!dataset.symbol

export const isDynamicSource = (dataset) =>
  typeof dataset.geojson === 'string' &&
  !!dataset.idProperty &&
  typeof dataset.transformRequest === 'function'

const HASH_BASE = 36
const MAX_TILE_ZOOM = 22

export { MAX_TILE_ZOOM }

export const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = Math.trunc(((hash << 5) - hash) + ch.codePointAt(0))
  }
  return Math.abs(hash).toString(HASH_BASE)
}

// ─── Source ID ────────────────────────────────────────────────────────────────

export const getSourceId = (dataset) => {
  if (dataset.tiles) {
    const tilesKey = Array.isArray(dataset.tiles) ? dataset.tiles.join(',') : dataset.tiles
    return `tiles-${hashString(tilesKey)}`
  }
  if (dataset.geojson) {
    if (isDynamicSource(dataset)) {
      return `geojson-dynamic-${dataset.id}`
    }
    if (typeof dataset.geojson === 'string') {
      return `geojson-${hashString(dataset.geojson)}`
    }
    return `geojson-${dataset.id}`
  }
  return `source-${dataset.id}`
}

// ─── Layer IDs ────────────────────────────────────────────────────────────────

export const getLayerIds = (dataset) => {
  if (hasSymbol(dataset)) {
    return { fillLayerId: null, strokeLayerId: null, symbolLayerId: dataset.id }
  }
  const hasFill = (!!dataset.fill && dataset.fill !== 'transparent') || hasPattern(dataset)
  const hasStroke = !!dataset.stroke
  const fillLayerId = hasFill ? dataset.id : null
  let strokeLayerId = null
  if (hasStroke) {
    strokeLayerId = hasFill ? `${dataset.id}-stroke` : dataset.id
  }
  return { fillLayerId, strokeLayerId, symbolLayerId: null }
}

export const getSublayerLayerIds = (datasetId, sublayerId) => ({
  fillLayerId: `${datasetId}-${sublayerId}`,
  strokeLayerId: `${datasetId}-${sublayerId}-stroke`,
  symbolLayerId: `${datasetId}-${sublayerId}-symbol`
})

export const getAllLayerIds = (dataset) => {
  if (dataset.sublayers?.length) {
    return dataset.sublayers.flatMap(sublayer => {
      const { fillLayerId, strokeLayerId, symbolLayerId } = getSublayerLayerIds(dataset.id, sublayer.id)
      return [strokeLayerId, fillLayerId, symbolLayerId]
    })
  }
  const { fillLayerId, strokeLayerId, symbolLayerId } = getLayerIds(dataset)
  return [strokeLayerId, fillLayerId, symbolLayerId].filter(Boolean)
}
