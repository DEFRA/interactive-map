import { DEFAULTS } from '../defaults.js'
import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

export const buildStylesMap = (dataLayers, mapStyle) => {
  const stylesMap = {}

  if (!mapStyle) {
    return stylesMap
  }

  const schemeSelectedColor = mapStyle.mapColorScheme === 'dark' ? '#ffffff' : '#0b0c0c'

  dataLayers.forEach(layer => {
    const stroke = layer.selectedStroke || mapStyle.selectedColor || schemeSelectedColor || DEFAULTS.selectedColor
    const fill = layer.selectedFill || 'transparent'
    const strokeWidth = layer.selectedStrokeWidth || DEFAULTS.selectedStrokeWidth

    stylesMap[layer.layerId] = {
      stroke: getValueForStyle(stroke, mapStyle.id),
      fill: getValueForStyle(fill, mapStyle.id),
      strokeWidth
    }
  })

  return stylesMap
}
