import { getValueForStyle } from '../utils/getValueForStyle.js'
import { symbolDefaults, pin, circle, square, hexagon, triangle, diamond, graphics, DEFAULT_SYMBOL_VIEWBOX } from '../config/symbolConfig.js'
import { getSymbolStyleColors, getSymbolScale } from '../utils/symbolUtils.js'
import { THEME_COLORS } from '../config/mapTheme.js'
import { rasteriseToImageData } from '../utils/rasteriseToImageData.js'
import {
  composeSymbolDef, applyAnchorOverride, scaleSvgSymbolDef, renderComposed, renderTemplate
} from './symbolComposer.js'

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

// Rasterisations in progress: imageId → Promise<ImageData>, so callers asking for the same image
// at once (e.g. the datasets and draw plugins) share one rather than each drawing it
const pendingImageData = new Map()

const rasteriseOnce = (imageId, rasterise) => {
  if (!pendingImageData.has(imageId)) {
    const pending = rasterise()
      .then((imageData) => {
        cacheImageData(imageId, imageData)
        return imageData
      })
      .finally(() => pendingImageData.delete(imageId))
    pendingImageData.set(imageId, pending)
  }
  return pendingImageData.get(imageId)
}

const HASH_BASE = 36
const HASH_MULTIPLIER = 31
const FNV_OFFSET = 0x811c9dc5
const FNV_PRIME = 0x01000193

// Two independent 32-bit hashes (×31 and FNV-1a), together about 64 bits, so two different
// symbols sharing an image id — and one showing the other's image — is vanishingly unlikely
const hashString = (str) => {
  let multiplied = 0
  let fnv = FNV_OFFSET
  for (const character of str) {
    const code = character.codePointAt(0)
    // Math.imul takes its inputs as 32-bit integers, so multiplied wraps to 32 bits each pass
    multiplied = Math.imul(multiplied, HASH_MULTIPLIER) + code
    fnv = Math.imul(fnv ^ code, FNV_PRIME)
  }
  return (multiplied >>> 0).toString(HASH_BASE) + (fnv >>> 0).toString(HASH_BASE)
}

// The viewBox is part of the id: it sets the rasterised image's size, so the same SVG content at
// two viewBoxes (e.g. symbolSvgContent with different symbolViewBox values) is two images.
const imageIdFor = (prefix, resolvedSvg, viewBox, pixelRatio) => {
  const content = `${viewBox}|${resolvedSvg}`
  return `symbol-${prefix}${hashString(content)}-${pixelRatio}x`
}

// Keys that are structural — not token values for SVG substitution
const STRUCTURAL = new Set([
  'id', 'svg', 'viewBox', 'anchor', 'symbol', 'svgContent', 'size', 'symbolSvgContent', 'symbolSize',
  'path', 'bounds', 'anchorPoint', 'graphicCentre', 'bodyBox', 'transform', 'scale'
])

// Each symbol image variant: the resolve method that draws it, and its image id prefix
const SYMBOL_VARIANTS = {
  normal: { resolveWith: 'resolve', prefix: '' },
  active: { resolveWith: 'resolveActive', prefix: 'act-' },
  selected: { resolveWith: 'resolveSelected', prefix: 'sel-' }
}

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

function resolveValues (symbolDef, markerValues, mapStyle, constructorDefaults) {
  const mapStyleId = mapStyle?.id
  const symbolTokens = Object.fromEntries(
    Object.entries(symbolDef || {}).filter(([k]) => !STRUCTURAL.has(k))
  )
  const constructorTokens = Object.fromEntries(
    Object.entries(constructorDefaults).filter(([k]) => !STRUCTURAL.has(k))
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

// Sizing, image ids and rasterising. They read the registry only through `this` (its symbols,
// defaults and resolve methods), so every registry shares them.
const symbolImageMethods = {
  /**
   * A symbol variant's resolved SVG and image id, from the hash of that SVG, its viewBox and the
   * pixel ratio.
   *
   * @param {Object} style
   * @param {Object} mapStyle
   * @param {'normal'|'active'|'selected'} variant
   * @param {number} pixelRatio
   * @returns {{ symbolDef: Object, resolvedContent: string, imageId: string }|null}
   */
  resolveSymbolImage (style, mapStyle, variant, pixelRatio) {
    const symbolDef = this.getSymbolDef(style)
    if (!symbolDef) {
      return null
    }
    const { resolveWith, prefix } = SYMBOL_VARIANTS[variant] ?? SYMBOL_VARIANTS.normal
    const resolvedContent = this[resolveWith](symbolDef, getSymbolStyleColors(style), mapStyle)
    return { symbolDef, resolvedContent, imageId: imageIdFor(prefix, resolvedContent, symbolDef.viewBox, pixelRatio) }
  },

  /**
   * A deterministic image id for one variant of a symbol, without rasterising it.
   *
   * @param {Object} style
   * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
   * @param {'normal'|'active'|'selected'} variant
   * @param {number} pixelRatio - Device pixel ratio × map size scale factor
   * @returns {string|null}
   */
  getSymbolImageId (style, mapStyle, variant, pixelRatio) {
    return this.resolveSymbolImage(style, mapStyle, variant, pixelRatio)?.imageId ?? null
  },

  /**
   * Resolves the symbolDef for a dataset or draw style's symbol config, sized for
   * style.symbolSize. Marker options drop the symbol prefix (`svgContent`, `size`, `viewBox`,
   * `anchor`), so markers size their definition with getSizedSymbolDef instead.
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
    return this.getSizedSymbolDef(baseDef, { viewBox: style.symbolViewBox, size: style.symbolSize, anchor: style.symbolAnchor })
  },

  /**
   * Sizes a symbol definition for rendering. Built-in (path-based) symbols are composed at the
   * size's scale with fixed-width rings; SVG-template symbols are scaled as a whole. The result
   * always carries the viewBox and anchor for that size.
   *
   * @param {Object} symbolDef - a registered definition or { svg } for inline content
   * @param {Object} [options]
   * @param {string} [options.viewBox] - viewBox override, SVG-template symbols only
   * @param {string} [options.size] - 'small' | 'medium' | 'large', else the map's default
   * @param {number[]} [options.anchor] - anchor override, [x, y] in 0–1: a fraction of a built-in
   *   shape itself (so it stays on the same point at every size), or of an SVG-template symbol's viewBox
   * @returns {Object}
   */
  getSizedSymbolDef (symbolDef, { viewBox, size, anchor } = {}) {
    const scale = getSymbolScale(size ?? this.getDefaults().size)
    const sized = symbolDef.path
      ? composeSymbolDef(symbolDef, scale)
      : scaleSvgSymbolDef(symbolDef, viewBox ?? symbolDef.viewBox ?? DEFAULT_SYMBOL_VIEWBOX, scale)
    return applyAnchorOverride(sized, anchor)
  },

  /**
   * Rasterises one variant of a symbol to ImageData, for a map provider to register.
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
    const resolved = this.resolveSymbolImage(style, mapStyle, variant, pixelRatio)
    if (!resolved) {
      return null
    }
    const { symbolDef: { viewBox }, resolvedContent, imageId } = resolved

    let imageData = getCachedImageData(imageId)
    if (!imageData) {
      const [,, width, height] = viewBox.split(' ').map(Number)
      // Render at pixelRatio× to keep icons crisp at the current device DPI and map size.
      // The provider registers it at the same pixelRatio, so it displays at its logical size.
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width * pixelRatio}" height="${height * pixelRatio}" viewBox="${viewBox}">${resolvedContent}</svg>`
      imageData = await rasteriseOnce(imageId, () => rasteriseToImageData(svgString, width * pixelRatio, height * pixelRatio))
    }

    return { imageId, imageData }
  }
}

/**
 * Creates a symbol registry: the built-in symbols plus any registered custom ones, and the
 * app's symbolDefaults. Each map instance has its own, so maps on the same page can register
 * different symbols and defaults.
 *
 * @returns {Object} the registry
 */
export const createSymbolRegistry = () => {
  const symbols = new Map()
  let constructorDefaults = {}

  const registry = {
    /**
     * Sets this map's constructor-level defaults (its symbolDefaults config).
     * Merges onto symbolDefaults to form this map's token baseline.
     *
     * @param {Object} defaults - Constructor symbolDefaults config
     */
    setDefaults (defaults) {
      constructorDefaults = defaults || {}
    },

    /**
     * Returns this map's merged defaults (hardcoded + constructor overrides).
     * Includes both structural properties (symbol, viewBox, anchor) and token values.
     *
     * @returns {Object}
     */
    getDefaults () {
      return { ...symbolDefaults, ...constructorDefaults }
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
     * Registers the built-in symbols. Called when the registry is created.
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
      const colors = resolveValues(symbolDef, styleColors || {}, mapStyle, constructorDefaults)
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
      const colors = resolveValues(symbolDef, styleColors || {}, mapStyle, constructorDefaults)
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
      const colors = resolveValues(symbolDef, styleColors || {}, mapStyle, constructorDefaults)
      if (!symbolDef) { return '' }
      colors.activeColor = 'none'
      return renderSymbol(symbolDef, colors)
    },

    ...symbolImageMethods
  }

  registry.initialise()
  return registry
}
