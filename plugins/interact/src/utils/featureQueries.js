export const buildLayerConfigMap = dataLayers => {
  const map = {}
  for (const layer of dataLayers) {
    map[layer.layerId] = layer
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

export const findMatchingFeature = (features, layerConfigMap) => {
  for (const feature of features) {
    const layerId = feature.layer?.id
    if (layerConfigMap[layerId]) {
      return { feature, config: layerConfigMap[layerId] }
    }
  }
  return null
}
