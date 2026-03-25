import { hasPattern } from '../../styles/patterns.js'

// ─── Internal helpers ─────────────────────────────────────────────────────────

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
  const hasFill = !!dataset.fill || hasPattern(dataset)
  const hasStroke = !!dataset.stroke
  const fillLayerId = hasFill ? dataset.id : null
  const strokeLayerId = hasStroke ? (hasFill ? `${dataset.id}-stroke` : dataset.id) : null
  return { fillLayerId, strokeLayerId }
}

export const getRuleLayerIds = (datasetId, ruleId) => ({
  fillLayerId: `${datasetId}--rule-${ruleId}`,
  strokeLayerId: `${datasetId}--rule-${ruleId}-stroke`
})

export const getAllLayerIds = (dataset) => {
  if (dataset.featureStyleRules?.length) {
    return dataset.featureStyleRules.flatMap(rule => {
      const { fillLayerId: ruleFill, strokeLayerId: ruleStroke } = getRuleLayerIds(dataset.id, rule.id)
      return [ruleStroke, ruleFill]
    })
  }
  const { fillLayerId, strokeLayerId } = getLayerIds(dataset)
  return [strokeLayerId, fillLayerId].filter(Boolean)
}
