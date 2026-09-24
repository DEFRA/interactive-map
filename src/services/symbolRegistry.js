import { getValueForStyle } from '../utils/getValueForStyle.js'
import {
  symbolDefaults, pin, circle, square, hexagon, triangle, diamond, graphics,
  HALO_STROKE_WIDTH, SELECTED_RING_STROKE_WIDTH, ACTIVE_RING_STROKE_WIDTH, SYMBOL_PADDING
} from '../config/symbolConfig.js'
import { getSymbolStyleColors, getSymbolViewBox, getSymbolScale } from '../utils/symbolUtils.js'
import { THEME_COLORS } from '../config/mapTheme.js'
import { rasteriseToImageData } from '../utils/rasteriseToImageData.js'

const symbols = new Map()
// Module-level cache: imageId → ImageData. Avoids re-rasterising identical symbols.
const imageDataCache = new Map()
let _constructorDefaults = {}

const HASH_BASE = 36

const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = Math.trunc(((hash << 5) - hash) + ch.codePointAt(0))
  }
  return Math.abs(hash).toString(HASH_BASE)
}

// Keys that are structural — not token values for SVG substitution
const STRUCTURAL = new Set([
  'id', 'svg', 'viewBox', 'anchor', 'symbol', 'symbolSvgContent', 'symbolSize',
  'path', 'bounds', 'anchorPoint', 'graphicCentre', 'transform', 'scale'
])

const DEFAULT_SVG_VIEWBOX = '0 0 38 38'
const GRAPHIC_SCALE = 0.8
const round3 = (n) => Math.round(n * 1000) / 1000 // NOSONAR — 3dp: sub-pixel precision for SVG attributes

// Built-in (path-based) symbol definitions, composed per scale: symbolDef → Map(scale → sized def)
const composedCache = new WeakMap()

// Sizes a path-based built-in symbol. The body and graphic scale; the halo and rings are drawn
// as strokes at a fixed width (divided by the scale to cancel it out), so the viewBox is the
// scaled body plus a fixed SYMBOL_PADDING, rounded up to whole pixels so rasterised images
// have exact dimensions. The fractional anchor is recomputed from anchorPoint to match.
function composeSymbolDef (symbolDef, scale) {
  let byScale = composedCache.get(symbolDef)
  if (!byScale) {
    byScale = new Map()
    composedCache.set(symbolDef, byScale)
  }
  if (byScale.has(scale)) {
    return byScale.get(scale)
  }
  const [bx, by, bw, bh] = symbolDef.bounds
  const width = Math.ceil(bw * scale + SYMBOL_PADDING * 2)
  const height = Math.ceil(bh * scale + SYMBOL_PADDING * 2)
  const offsetX = (width - bw * scale) / 2
  const offsetY = (height - bh * scale) / 2
  const [ax, ay] = symbolDef.anchorPoint
  const sized = {
    ...symbolDef,
    scale,
    viewBox: `0 0 ${width} ${height}`,
    anchor: [
      round3(((ax - bx) * scale + offsetX) / width),
      round3(((ay - by) * scale + offsetY) / height)
    ],
    transform: `translate(${round3(offsetX)}, ${round3(offsetY)}) scale(${scale}) translate(${-bx}, ${-by})`
  }
  byScale.set(scale, sized)
  return sized
}

// Sizes an SVG-template symbol (custom symbols, or symbolSvgContent) by scaling it as a whole —
// its own rings, if it draws any, scale with it.
function scaleSvgSymbolDef (symbolDef, viewBox, scale) {
  if (scale === 1) {
    return { ...symbolDef, viewBox }
  }
  const scaledViewBox = viewBox.split(' ').map((n) => round3(Number(n) * scale)).join(' ')
  return { ...symbolDef, viewBox: scaledViewBox, svg: `<g transform="scale(${scale})">${symbolDef.svg}</g>` }
}

const hasColor = (color) => !!color && color !== 'none'

// Rings are only emitted when shown, so an unselected symbol is a single path plus its graphic.
function renderComposed (symbolDef, values) {
  const { path, scale, transform, graphicCentre: [gx, gy] } = symbolDef
  const ring = (color, strokeWidth) =>
    `<path d="${path}" fill="none" stroke="${color}" stroke-width="${round3(strokeWidth / scale)}" stroke-linejoin="round"/>`
  const layers = [
    hasColor(values.activeColor) ? ring(values.activeColor, ACTIVE_RING_STROKE_WIDTH) : '',
    hasColor(values.selectedColor) ? ring(values.selectedColor, SELECTED_RING_STROKE_WIDTH) : '',
    `<path d="${path}" fill="${values.backgroundColor}" stroke="${values.haloColor}" stroke-width="${round3(HALO_STROKE_WIDTH / scale)}" stroke-linejoin="round" paint-order="stroke fill"/>`,
    `<g transform="translate(${gx}, ${gy}) scale(${GRAPHIC_SCALE}) translate(-8, -8)"><path d="${values.graphic}" fill="${values.foregroundColor}"/></g>`
  ]
  return `<g transform="${transform}">${layers.join('')}</g>`
}

function renderSymbol (symbolDef, values) {
  if (symbolDef.path) {
    // Accept an unsized (registered) built-in def too, rendering it at medium
    const sized = symbolDef.transform ? symbolDef : composeSymbolDef(symbolDef, 1)
    return renderComposed(sized, values)
  }
  return resolveLayer(symbolDef.svg, values)
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
    return `symbol-${active ? 'act-' : ''}${hashString(resolved)}-${pixelRatio}x`
  },

  /**
   * Resolves the symbolDef for a style's symbol config, sized for style.symbolSize.
   *
   * style.symbol is a string symbol ID (e.g. 'pin').
   * style.symbolSvgContent is inline SVG content for a custom symbol.
   * style.symbolViewBox overrides the viewBox of an SVG-template symbol.
   *
   * @param {Object} style
   * @returns {Object|undefined} with viewBox and anchor for that size
   */
  getSymbolDef (style) {
    const baseDef = style.symbolSvgContent ? { svg: style.symbolSvgContent } : style.symbol && this.get(style.symbol)
    if (!baseDef) {
      return undefined
    }
    return this.getSizedSymbolDef(baseDef, { viewBox: style.symbolViewBox, symbolSize: style.symbolSize })
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
   * @returns {Object}
   */
  getSizedSymbolDef (symbolDef, { viewBox, symbolSize } = {}) {
    const scale = getSymbolScale(symbolSize ?? this.getDefaults().symbolSize)
    if (symbolDef.path) {
      return composeSymbolDef(symbolDef, scale)
    }
    return scaleSvgSymbolDef(symbolDef, viewBox ?? symbolDef.viewBox ?? DEFAULT_SVG_VIEWBOX, scale)
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

    const imageId = `symbol-${prefix}${hashString(resolvedContent)}-${pixelRatio}x`

    let imageData = imageDataCache.get(imageId)
    if (!imageData) {
      const viewBox = getSymbolViewBox(style, symbolDef)
      const [,, width, height] = viewBox.split(' ').map(Number)
      // Render at pixelRatio× to keep icons crisp at the current device DPI and map size.
      // MapLibre receives the matching pixelRatio so the image displays at its original logical size.
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * pixelRatio}" height="${height * pixelRatio}" viewBox="${viewBox}">${resolvedContent}</svg>`
      imageData = await rasteriseToImageData(svgString, width * pixelRatio, height * pixelRatio)
      imageDataCache.set(imageId, imageData)
    }

    return { imageId, imageData }
  }
}

symbolRegistry.initialise()
