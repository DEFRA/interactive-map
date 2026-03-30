import { getValueForStyle } from '../utils/getValueForStyle.js'
import { symbolDefaults } from '../symbols/symbolDefaults.js'
import { pin } from '../symbols/pin.js'
import { circle } from '../symbols/circle.js'

const symbols = new Map()

function resolveValues (styleValues, mapStyleId) {
  const defined = Object.fromEntries(Object.entries(styleValues).filter(([, v]) => v != null))
  const merged = { ...symbolDefaults, ...defined }
  return Object.fromEntries(
    Object.entries(merged).map(([token, value]) => [token, getValueForStyle(value, mapStyleId) || ''])
  )
}

function resolveLayer (svgString, values) {
  return Object.entries(values).reduce(
    (svg, [token, value]) => svg.replaceAll(`{{${token}}}`, value),
    svgString
  )
}

export const symbolRegistry = {
  register (symbolDef) {
    symbols.set(symbolDef.id, symbolDef)
  },

  get (id) {
    return symbols.get(id)
  },

  list () {
    return [...symbols.values()]
  },

  /**
   * Resolve a symbol's SVG string with colors injected.
   *
   * @param {Object} symbolDef - Symbol definition from the registry
   * @param {Object} styleColors - Color overrides. Each value may be a plain string
   *   or a map-style-keyed object e.g. { outdoor: '#ff0000', dark: '#fff' }.
   *   Keys: selected, halo, background, foreground
   * @param {string} mapStyleId - Current map style id used to resolve keyed colors
   * @returns {string} Resolved SVG string ready for rendering
   */
  resolve (symbolDef, styleColors, mapStyleId) {
    const colors = resolveValues(styleColors || {}, mapStyleId)
    return resolveLayer(symbolDef.svg, colors)
  }
}

// Register built-in defaults
symbolRegistry.register(pin)
symbolRegistry.register(circle)
