import { getValueForStyle } from '../../../../src/utils/getValueForStyle.js'
import { THEME_COLORS } from '../../../../src/config/mapTheme.js'
import { SELECTED_STROKE_WIDTH, ACTIVE_STROKE_WIDTH } from '../../../../src/config/symbolConfig.js'

/**
 * Builds a map of layerId → resolved highlight style for the given data layers.
 *
 * Colour resolution order (both active and selection strokes):
 *   layer override → mapStyle override → mapColorScheme scheme default
 *
 * @param {Object[]} dataLayers
 * @param {Object} mapStyle - Current map style config
 * @returns {Object} layerId → {
 *   stroke: string,           — active (keyboard cursor) line colour
 *   selectionStroke: string,  — committed-selection line colour
 *   fill: string,             — committed-selection fill colour (transparent when not set)
 *   strokeWidth: number       — line-width applied to all highlight line layers (both active and selected states)
 * }
 */
export const buildStylesMap = (dataLayers, mapStyle) => {
  const stylesMap = {}

  if (!mapStyle) {
    console.warn('[interact] buildStylesMap: mapStyle is null/undefined, cannot build styles')
    return stylesMap
  }

  const scheme = THEME_COLORS[mapStyle.mapColorScheme] ?? THEME_COLORS.light
  const schemeActiveColor = mapStyle.activeColor ?? scheme.activeColor
  const schemeSelectedColor = mapStyle.selectedColor ?? scheme.selectedColor

  dataLayers.forEach(layer => {
    const activeStroke = layer.activeStroke || schemeActiveColor
    const selectionStroke = layer.selectedStroke || schemeSelectedColor
    const fill = layer.selectedFill || 'transparent'
    const strokeWidth = layer.selectedStrokeWidth || SELECTED_STROKE_WIDTH
    const activeStrokeWidth = strokeWidth + ACTIVE_STROKE_WIDTH // ACTIVE_STROKE_WIDTH is the total overhang (extends SELECTED_STROKE_WIDTH each side)

    stylesMap[layer.layerId] = {
      stroke: getValueForStyle(activeStroke, mapStyle.id),
      selectionStroke: getValueForStyle(selectionStroke, mapStyle.id),
      fill: getValueForStyle(fill, mapStyle.id),
      strokeWidth,
      activeStrokeWidth
    }
  })

  return stylesMap
}
