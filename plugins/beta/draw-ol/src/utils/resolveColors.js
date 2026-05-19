import { DEFAULTS } from '../defaults.js'

const resolveVariant = (value, scheme, styleId) => {
  if (typeof value !== 'object' || value === null) { return value }
  if (styleId && value[styleId] !== undefined) { return value[styleId] }
  if (value[scheme] !== undefined) { return value[scheme] }
  if (value.light !== undefined) { return value.light }
  return Object.values(value)[0]
}

/**
 * Resolve all draw-ol colors for the given map style and plugin config overrides.
 *
 * Values in pluginConfig may be plain strings or variant objects (e.g. { light: '...', dark: '...' }).
 * Variant resolution order: exact style ID match → color scheme → 'light' fallback → first value.
 *
 * @param {object|null} mapStyle - Current map style object (has .id and .mapColorScheme)
 * @param {object} pluginConfig - Plugin-level user overrides (may override any DEFAULTS key)
 * @returns {object} Flat color values ready for use in createStyles()
 */
export const resolveColors = (mapStyle, pluginConfig = {}) => {
  const scheme = mapStyle?.mapColorScheme ?? 'light'
  const styleId = mapStyle?.id ?? null
  const r = (key) => resolveVariant(pluginConfig[key] ?? DEFAULTS[key], scheme, styleId)

  return {
    editStroke: r('editStroke'),
    editVertex: r('editVertex'),
    editMidpoint: r('editMidpoint'),
    editActive: r('editActive'),
    editHalo: r('editHalo'),
    shapeStroke: r('shapeStroke'),
    strokeWidth: pluginConfig.strokeWidth ?? DEFAULTS.strokeWidth,
    shapeFill: r('shapeFill'),
    snapVertex: r('snapVertex'),
    snapEdge: r('snapEdge'),
    mapStyleId: styleId
  }
}
