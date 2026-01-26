import { DEFAULTS } from '../defaults.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

export const buildStylesMap = (dataLayers, mapStyle) => {
  const stylesMap = {}

  if (!mapStyle) {
    return stylesMap
  }

  dataLayers.forEach(layer => {
    const base = layer.selectedFeatureStyle || DEFAULTS.selectedFeatureStyle

    stylesMap[layer.layerId] = {
      ...base,
      stroke: getValueForStyle(base.stroke, mapStyle.id),
      fill: getValueForStyle(base.fill, mapStyle.id)
    }
  })

  return stylesMap
}
