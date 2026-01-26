import { DEFAULTS } from '../defaults.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

export const buildStylesMap = (dataLayers, mapStyle) => {
  const stylesMap = {}

  if (!mapStyle) {
    return stylesMap
  }

  dataLayers.forEach(layer => {
    const stroke = layer.selectedStroke || DEFAULTS.selectedStroke
    const fill = layer.selectedFill || DEFAULTS.selectedFill
    const strokeWidth = layer.selectedStrokeWidth || DEFAULTS.selectedStrokeWidth

    stylesMap[layer.layerId] = {
      stroke: getValueForStyle(stroke, mapStyle.id),
      fill: getValueForStyle(fill, mapStyle.id),
      strokeWidth
    }
  })

  return stylesMap
}
