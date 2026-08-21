// mapbox-gl-draw (MapLibre only) splits every layer into a `.cold`/`.hot` sibling pair — see
// providers/maplibre/src/utils/drawLayerBuckets.js. Inlined here (not imported) since this file
// stays provider-agnostic and OpenLayers has no such split.
const drawBucketSiblingSuffix = { '.cold': '.hot', '.hot': '.cold' }

const siblingLayerId = (layerId) => {
  for (const [suffix, sibling] of Object.entries(drawBucketSiblingSuffix)) {
    if (layerId.endsWith(suffix)) {
      return `${layerId.slice(0, -suffix.length)}${sibling}`
    }
  }
  return null
}

export const buildLayerConfigMap = dataLayers => {
  const map = {}
  for (const layer of dataLayers) {
    map[layer.layerId] = layer
    const sibling = siblingLayerId(layer.layerId)
    if (sibling) {
      map[sibling] = layer
    }
  }
  return map
}

export const getFeaturesAtPoint = (mapProvider, point, options) => {
  try {
    return mapProvider?.getFeaturesAtPoint(point, options) || []
  } catch (err) {
    console.warn('Feature query failed:', err)
    return []
  }
}

const isPointGeometry = (feature) => {
  const type = feature.geometry?.type
  return type === 'Point' || type === 'MultiPoint'
}

export const findMatchingFeature = (features, layerConfigMap) => {
  const matched = features.filter(f => layerConfigMap[f.layer?.id])
  const pointMatch = matched.find(isPointGeometry)
  if (pointMatch) {
    return { feature: pointMatch, config: layerConfigMap[pointMatch.layer.id] }
  }
  const first = matched[0]
  return first ? { feature: first, config: layerConfigMap[first.layer.id] } : null
}
