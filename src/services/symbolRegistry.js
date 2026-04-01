import { getValueForStyle } from '../utils/getValueForStyle.js'
import { symbolDefaults, pin, circle, square, graphics } from '../config/symbolConfig.js'

const symbols = new Map()
let _constructorDefaults = {}

// Keys that are structural — not token values for SVG substitution
const STRUCTURAL = new Set(['id', 'svg', 'viewBox', 'anchor', 'symbol', 'symbolSvgContent'])

// selected/selectedWidth are app-wide concerns — not overridable at symbol registration level.
// They can only be set in symbolDefaults.js or the constructor symbolDefaults config.
const REGISTRY_EXCLUDED = new Set([...STRUCTURAL, 'selected', 'selectedWidth'])

function resolveValues (symbolDef, markerValues, mapStyleId) {
  const symbolTokens = Object.fromEntries(
    Object.entries(symbolDef || {}).filter(([k]) => !REGISTRY_EXCLUDED.has(k))
  )
  const constructorTokens = Object.fromEntries(
    Object.entries(_constructorDefaults).filter(([k]) => !STRUCTURAL.has(k))
  )
  const defined = Object.fromEntries(
    Object.entries(markerValues).filter(([, v]) => v != null)
  )
  const merged = { ...symbolDefaults, ...constructorTokens, ...symbolTokens, ...defined }
  if (typeof merged.graphic === 'string' && graphics[merged.graphic]) {
    merged.graphic = graphics[merged.graphic]
  }
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
  /**
   * Set constructor-level defaults. Called once during app initialisation.
   * Merges onto symbolDefaults to form the app-wide token baseline.
   *
   * @param {Object} defaults - Constructor symbolDefaults config
   */
  setDefaults (defaults) {
    _constructorDefaults = defaults || {}
  },

  /**
   * Returns the merged app-wide defaults (hardcoded + constructor overrides).
   * Includes both structural properties (symbol, viewBox, anchor) and token values.
   *
   * @returns {Object}
   */
  getDefaults () {
    return { ...symbolDefaults, ..._constructorDefaults }
  },

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
   * Resolve a symbol's SVG string for normal (unselected) rendering.
   * The selected ring is always hidden regardless of cascade values.
   *
   * @param {Object} symbolDef - Symbol definition
   * @param {Object} styleColors - Token overrides (selected and selectedWidth are ignored)
   * @param {string} mapStyleId - Current map style id
   * @returns {string} Resolved SVG string
   */
  resolve (symbolDef, styleColors, mapStyleId) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyleId)
    if (!symbolDef) { return '' }
    colors.selected = ''
    return resolveLayer(symbolDef.svg, colors)
  },

  /**
   * Resolve a symbol's SVG string for selected rendering.
   * The selected ring colour and width come from the cascade
   * (symbolDef → constructor symbolDefaults → symbolDefaults.js).
   *
   * @param {Object} symbolDef - Symbol definition
   * @param {Object} styleColors - Token overrides (selected and selectedWidth come from cascade only)
   * @param {string} mapStyleId - Current map style id
   * @returns {string} Resolved SVG string
   */
  resolveSelected (symbolDef, styleColors, mapStyleId) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyleId)
    if (!symbolDef) { return '' }
    return resolveLayer(symbolDef.svg, colors)
  }
}

symbolRegistry.register(pin)
symbolRegistry.register(circle)
symbolRegistry.register(square)
