import { COLORS, SIZES } from '../defaults.js'
import { getValueForStyle } from '../../../utils/getColorForScheme.js'

/**
 * Resolve all draw-ol colors for the given map style and plugin config overrides.
 *
 * Values in pluginConfig may be plain strings or variant objects (e.g. { light: '...', dark: '...' }).
 * Variant resolution order: exact style ID match → color scheme → 'light' fallback → first value.
 *
 * @param {object|null} mapStyle - Current map style object (has .id and .mapColorScheme)
 * @param {object} pluginConfig - Plugin-level user overrides (may override any COLORS key)
 * @returns {object} Flat color values ready for use in createStyles()
 */
export const resolveColors = (mapStyle, pluginConfig = {}) => {
  const scheme = mapStyle?.mapColorScheme ?? 'light'
  const styleId = mapStyle?.id ?? null
  const resolveColor = (key) => getValueForStyle(pluginConfig[key] ?? COLORS[key], scheme, styleId)

  return {
    mousePointer: resolveColor('mousePointer'),
    mousePointerHalo: resolveColor('mousePointerHalo'),
    editStroke: resolveColor('editStroke'),
    editFill: resolveColor('editFill'),
    editVertex: resolveColor('editVertex'),
    editMidpoint: resolveColor('editMidpoint'),
    editActive: resolveColor('editActive'),
    editHalo: resolveColor('editHalo'),
    shapeStroke: resolveColor('shapeStroke'),
    strokeWidth: pluginConfig.strokeWidth ?? SIZES.strokeWidth,
    shapeFill: resolveColor('shapeFill'),
    snapVertex: resolveColor('snapVertex'),
    snapEdge: resolveColor('snapEdge'),
    mapStyleId: styleId
  }
}
