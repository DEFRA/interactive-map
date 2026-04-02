import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'

const DEFAULT_STROKE_WIDTH = 3

export const buildStylesMap = (dataLayers, mapStyle) => {
  const stylesMap = {}

  if (!mapStyle) {
    return stylesMap
  }

  const schemeSelectedColor = mapStyle.mapColorScheme === 'dark' ? '#ffffff' : '#0b0c0c'

  dataLayers.forEach(layer => {
    const stroke = layer.selectedStroke || mapStyle.selectedColor || schemeSelectedColor
    const fill = layer.selectedFill || 'transparent'
    const strokeWidth = layer.selectedStrokeWidth || DEFAULT_STROKE_WIDTH

    stylesMap[layer.layerId] = {
      stroke: getValueForStyle(stroke, mapStyle.id),
      fill: getValueForStyle(fill, mapStyle.id),
      strokeWidth
    }
  })

  return stylesMap
}
