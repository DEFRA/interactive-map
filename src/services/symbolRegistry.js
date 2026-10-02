import { getValueForStyle } from '../utils/getValueForStyle.js'
import { symbolDefaults, pin, circle, square, hexagon, triangle, diamond, graphics } from '../config/symbolConfig.js'
import { getSymbolStyleColors, getSymbolViewBox, getSymbolScale } from '../utils/symbolUtils.js'
import { THEME_COLORS } from '../config/mapTheme.js'
import { rasteriseToImageData } from '../utils/rasteriseToImageData.js'
import {
  composeSymbolDef, applyAnchorOverride, scaleSvgSymbolDef, renderComposed, renderTemplate
} from './symbolComposer.js'

const symbols = new Map()
// Module-level cache: imageId → ImageData. Avoids re-rasterising identical symbols. Bounded —
// every style or pixel-ratio change brings new ids — dropping the least recently used entry,
// which at worst means re-rasterising it.
const imageDataCache = new Map()
const IMAGE_DATA_CACHE_SIZE = 256

const getCachedImageData = (imageId) => {
  const imageData = imageDataCache.get(imageId)
  if (imageData) {
    // Re-insert so Map order tracks recency — the first key is always the least recently used
    imageDataCache.delete(imageId)
    imageDataCache.set(imageId, imageData)
  }
  return imageData
}

const cacheImageData = (imageId, imageData) => {
  imageDataCache.set(imageId, imageData)
  if (imageDataCache.size > IMAGE_DATA_CACHE_SIZE) {
    imageDataCache.delete(imageDataCache.keys().next().value)
  }
}
let _constructorDefaults = {}

const HASH_BASE = 36
const HASH_SHIFT = 5 // hash × 31 + character: (hash << 5) - hash

const hashString = (str) => {
  let hash = 0
  for (const character of str) {
    hash = Math.trunc(((hash << HASH_SHIFT) - hash) + character.codePointAt(0))
  }
  return Math.abs(hash).toString(HASH_BASE)
}

// The viewBox is part of the id: it sets the rasterised image's size, so the same SVG content at
// two viewBoxes (e.g. symbolSvgContent with different symbolViewBox values) is two images.
const imageIdFor = (prefix, resolvedSvg, viewBox, pixelRatio) => {
  const content = `${viewBox}|${resolvedSvg}`
  return `symbol-${prefix}${hashString(content)}-${pixelRatio}x`
}

// Keys that are structural — not token values for SVG substitution
const STRUCTURAL = new Set([
  'id', 'svg', 'viewBox', 'anchor', 'symbol', 'symbolSvgContent', 'symbolSize',
  'path', 'bounds', 'anchorPoint', 'graphicCentre', 'bodyBox', 'transform', 'scale'
])

const DEFAULT_SVG_VIEWBOX = '0 0 38 38'

const POINT_LENGTH = 2
const BOX_LENGTH = 4 // [x, y, width, height], and a viewBox's four values

const isNumberList = (value, length) => Array.isArray(value) && value.length === length && value.every(Number.isFinite)

// Built-in shape format — bounds, anchorPoint and graphicCentre are all required
const validatePathSymbolDef = ({ id, bounds, anchorPoint, graphicCentre }) => {
  if (!isNumberList(bounds, BOX_LENGTH)) {
    throw new TypeError(`symbolRegistry.register: symbol "${id}" has a "path" but no valid "bounds" ([x, y, width, height])`)
  }
  if (!isNumberList(anchorPoint, POINT_LENGTH) || !isNumberList(graphicCentre, POINT_LENGTH)) {
    throw new TypeError(`symbolRegistry.register: symbol "${id}" has a "path" but no valid "anchorPoint" and "graphicCentre" ([x, y])`)
  }
}

const validateSvgSymbolDef = ({ id, svg, viewBox, anchor }) => {
  if (typeof svg !== 'string' || !svg) {
    throw new TypeError(`symbolRegistry.register: symbol "${id}" needs an "svg" template`)
  }
  if (typeof viewBox !== 'string' || viewBox.trim().split(/[\s,]+/).length !== BOX_LENGTH) {
    throw new TypeError(`symbolRegistry.register: symbol "${id}" needs a "viewBox" ('minX minY width height')`)
  }
  if (anchor !== undefined && !isNumberList(anchor, POINT_LENGTH)) {
    throw new TypeError(`symbolRegistry.register: symbol "${id}" has an invalid "anchor" — expected [x, y] in 0–1`)
  }
}

// Fails fast with a message naming the symbol, rather than a crash at render time.
const validateSymbolDef = (symbolDef) => {
  if (typeof symbolDef?.id !== 'string' || !symbolDef.id) {
    throw new TypeError('symbolRegistry.register: a symbol needs a string "id"')
  }
  if (symbolDef.path) {
    validatePathSymbolDef(symbolDef)
  } else {
    validateSvgSymbolDef(symbolDef)
  }
}

function renderSymbol (symbolDef, values) {
  if (symbolDef.path) {
    // Accept an unsized (registered) built-in def too, rendering it at medium
    const sized = symbolDef.transform ? symbolDef : composeSymbolDef(symbolDef, 1)
    return renderComposed(sized, values)
  }
  return renderTemplate(symbolDef.svg, values)
}

// selectedColor and activeColor are map style concerns — always injected from mapStyle, never from cascade.

function resolveValues (symbolDef, markerValues, mapStyle) {
  const mapStyleId = mapStyle?.id
  const symbolTokens = Object.fromEntries(
    Object.entries(symbolDef || {}).filter(([k]) => !STRUCTURAL.has(k))
  )
  const constructorTokens = Object.fromEntries(
    Object.entries(_constructorDefaults).filter(([k]) => !STRUCTURAL.has(k))
  )
  const defined = Object.fromEntries(
    Object.entries(markerValues).filter(([, v]) => v != null)
  )
  const merged = { ...symbolDefaults, ...constructorTokens, ...symbolTokens, ...defined }
  // haloColor, selectedColor and activeColor are map style concerns — always injected from mapStyle, never from the cascade
  const scheme = THEME_COLORS[mapStyle?.mapColorScheme] ?? THEME_COLORS.light
  merged.haloColor = mapStyle?.haloColor ?? scheme.haloColor
  merged.selectedColor = mapStyle?.selectedColor ?? scheme.selectedColor
  merged.activeColor = mapStyle?.activeColor ?? scheme.activeColor
  if (typeof merged.graphic === 'string' && graphics[merged.graphic]) {
    merged.graphic = graphics[merged.graphic]
  }
  return Object.fromEntries(
    Object.entries(merged).map(([token, value]) => [token, getValueForStyle(value, mapStyleId) || ''])
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

  /**
   * Register a custom symbol: an SVG template with {{token}} placeholders, its viewBox and an
   * optional anchor. Throws a descriptive error for an incomplete definition.
   *
   * @param {Object} symbolDef
   */
  register (symbolDef) {
    validateSymbolDef(symbolDef)
    symbols.set(symbolDef.id, symbolDef)
  },

  get (id) {
    return symbols.get(id)
  },

  list () {
    return [...symbols.values()]
  },

  /**
   * Clears all registered symbols (including built-ins). Mainly for testing purposes.
   */
  clear () {
    symbols.clear()
  },

  /**
   * Clears all registered symbols (including built-ins). Mainly for testing purposes.
   */
  initialise () {
    this.register(pin)
    this.register(circle)
    this.register(square)
    this.register(hexagon)
    this.register(triangle)
    this.register(diamond)
  },

  /**
   * Resolve a symbol's SVG string for normal (unselected, inactive) rendering.
   * Both selectedColor and activeColor are set to 'none' — all rings hidden.
   *
   * @param {Object} symbolDef - Symbol definition
   * @param {Object} styleColors - Token overrides
   * @param {Object} mapStyle - Current map style config (provides selectedColor, activeColor, haloColor)
   * @returns {string} Resolved SVG string
   */
  resolve (symbolDef, styleColors, mapStyle) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyle)
    if (!symbolDef) { return '' }
    colors.selectedColor = 'none'
    colors.activeColor = 'none'
    return renderSymbol(symbolDef, colors)
  },

  /**
   * Resolve a symbol's SVG string for active (keyboard cursor) rendering.
   * Both selectedColor (committed ring) and activeColor (focus ring) are shown simultaneously,
   * so an item that is active always displays both rings regardless of selection state.
   *
   * @param {Object} symbolDef - Symbol definition
   * @param {Object} styleColors - Token overrides
   * @param {Object} mapStyle - Current map style config (provides selectedColor, activeColor, haloColor)
   * @returns {string} Resolved SVG string
   */
  resolveActive (symbolDef, styleColors, mapStyle) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyle)
    if (!symbolDef) { return '' }
    return renderSymbol(symbolDef, colors)
  },

  /**
   * Resolve a symbol's SVG string for committed-selection rendering.
   * selectedColor (committed ring) is shown; activeColor is set to 'none'.
   *
   * @param {Object} symbolDef - Symbol definition
   * @param {Object} styleColors - Token overrides
   * @param {Object} mapStyle - Current map style config (provides selectedColor, activeColor, haloColor)
   * @returns {string} Resolved SVG string
   */
  resolveSelected (symbolDef, styleColors, mapStyle) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyle)
    if (!symbolDef) { return '' }
    colors.activeColor = 'none'
    return renderSymbol(symbolDef, colors)
  },

  // ─── Image IDs ────────────────────────────────────────────────────────────────

  /**
 * Returns a deterministic image ID for a symbol in normal or selected state.
 * Based on the hash of the fully resolved SVG content and the pixel ratio.
 *
 * @param {Object} style
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {boolean} [selected=false]
 * @param {number} [pixelRatio=2] - Device pixel ratio × map size scale factor
 * @returns {string|null}
 */
  getSymbolImageId (style, mapStyle, active = false, pixelRatio = 2) {
    const symbolDef = this.getSymbolDef(style)
    if (!symbolDef) {
      return null
    }
    const styleColors = getSymbolStyleColors(style)
    const resolved = active
      ? this.resolveActive(symbolDef, styleColors, mapStyle)
      : this.resolve(symbolDef, styleColors, mapStyle)
    return imageIdFor(active ? 'act-' : '', resolved, symbolDef.viewBox, pixelRatio)
  },

  /**
   * Resolves the symbolDef for a style's symbol config, sized for style.symbolSize.
   *
   * style.symbol is a string symbol ID (e.g. 'pin').
   * style.symbolSvgContent is inline SVG content for a custom symbol.
   * style.symbolViewBox overrides the viewBox of an SVG-template symbol.
   * style.symbolAnchor overrides the anchor — see getSizedSymbolDef.
   *
   * @param {Object} style
   * @returns {Object|undefined} with viewBox and anchor for that size
   */
  getSymbolDef (style) {
    const baseDef = style.symbolSvgContent ? { svg: style.symbolSvgContent } : style.symbol && this.get(style.symbol)
    if (!baseDef) {
      return undefined
    }
    return this.getSizedSymbolDef(baseDef, { viewBox: style.symbolViewBox, symbolSize: style.symbolSize, anchor: style.symbolAnchor })
  },

  /**
   * Sizes a symbol definition for rendering. Built-in (path-based) symbols are composed at the
   * size's scale with fixed-width rings; SVG-template symbols are scaled as a whole. The result
   * always carries the viewBox (and, for built-ins, the anchor) for that size.
   *
   * @param {Object} symbolDef - a registered definition or { svg } for inline content
   * @param {Object} [options]
   * @param {string} [options.viewBox] - viewBox override, SVG-template symbols only
   * @param {string} [options.symbolSize] - 'small' | 'medium' | 'large', else the app default
   * @param {number[]} [options.anchor] - anchor override, [x, y] in 0–1: a fraction of a built-in
   *   shape itself (so it stays on the same point at every size), or of an SVG-template symbol's viewBox
   * @returns {Object}
   */
  getSizedSymbolDef (symbolDef, { viewBox, symbolSize, anchor } = {}) {
    const scale = getSymbolScale(symbolSize ?? this.getDefaults().symbolSize)
    const sized = symbolDef.path
      ? composeSymbolDef(symbolDef, scale)
      : scaleSvgSymbolDef(symbolDef, viewBox ?? symbolDef.viewBox ?? DEFAULT_SVG_VIEWBOX, scale)
    return applyAnchorOverride(sized, anchor)
  },

  /**
 * Rasterise one variant of a symbol to ImageData for use as a MapLibre image.
 * Results are cached by imageId so identical symbols are only rendered once.
 *
 * @param {Object} style - Dataset or marker config with symbol properties
 * @param {Object} mapStyle - Current map style config
 * @param {'normal'|'active'|'selected'} variant
 *   - `'normal'`   — no rings (default display)
 *   - `'active'`   — both rings (keyboard cursor, yellow + black)
 *   - `'selected'` — selected ring only (black)
 * @param {number} pixelRatio - Device pixel ratio × map size scale factor
 * @returns {Promise<{imageId: string, imageData: ImageData}|null>}
 */
  async rasteriseSymbolImage (style, mapStyle, variant, pixelRatio) {
    const symbolDef = this.getSymbolDef(style)
    if (!symbolDef) {
      return null
    }
    const styleColors = getSymbolStyleColors(style)
    let resolvedContent, prefix
    if (variant === 'active') {
      resolvedContent = this.resolveActive(symbolDef, styleColors, mapStyle)
      prefix = 'act-'
    } else if (variant === 'selected') {
      resolvedContent = this.resolveSelected(symbolDef, styleColors, mapStyle)
      prefix = 'sel-'
    } else {
      resolvedContent = this.resolve(symbolDef, styleColors, mapStyle)
      prefix = ''
    }

    const viewBox = getSymbolViewBox(style, symbolDef)
    const imageId = imageIdFor(prefix, resolvedContent, viewBox, pixelRatio)

    let imageData = getCachedImageData(imageId)
    if (!imageData) {
      const [,, width, height] = viewBox.split(' ').map(Number)
      // Render at pixelRatio× to keep icons crisp at the current device DPI and map size.
      // MapLibre receives the matching pixelRatio so the image displays at its original logical size.
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * pixelRatio}" height="${height * pixelRatio}" viewBox="${viewBox}">${resolvedContent}</svg>`
      imageData = await rasteriseToImageData(svgString, width * pixelRatio, height * pixelRatio)
      cacheImageData(imageId, imageData)
    }

    return { imageId, imageData }
  }
}

symbolRegistry.initialise()
