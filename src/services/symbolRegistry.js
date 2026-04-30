import { getValueForStyle } from '../utils/getValueForStyle.js'
import { symbolDefaults, pin, circle, square, graphics } from '../config/symbolConfig.js'
import { getSymbolStyleColors, getSymbolViewBox } from '../utils/symbolUtils.js'
import { SCHEME_COLORS } from '../config/mapTheme.js'
import { rasteriseToImageData } from './rasteriseToImageData.js'

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
const STRUCTURAL = new Set(['id', 'svg', 'viewBox', 'anchor', 'symbol', 'symbolSvgContent'])

// selectedWidth is app-wide — not overridable at symbol registration level.
// selectedColor is a map style concern — always injected from mapStyle, never from cascade.
const REGISTRY_EXCLUDED = new Set([...STRUCTURAL, 'selectedWidth'])

function resolveValues (symbolDef, markerValues, mapStyle) {
  const mapStyleId = mapStyle?.id
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
  // haloColor and selectedColor are map style concerns — always injected from mapStyle, never from the cascade
  const scheme = SCHEME_COLORS[mapStyle?.mapColorScheme] ?? SCHEME_COLORS.light
  merged.haloColor = mapStyle?.haloColor ?? scheme.haloColor
  merged.selectedColor = mapStyle?.selectedColor ?? scheme.selectedColor
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
   * @param {Object} styleColors - Token overrides
   * @param {Object} mapStyle - Current map style config (provides selectedColor, haloColor)
   * @returns {string} Resolved SVG string
   */
  resolve (symbolDef, styleColors, mapStyle) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyle)
    if (!symbolDef) { return '' }
    colors.selectedColor = ''
    return resolveLayer(symbolDef.svg, colors)
  },

  /**
   * Resolve a symbol's SVG string for selected rendering.
   * selectedColor comes from mapStyle.selectedColor (or the hardcoded fallback).
   *
   * @param {Object} symbolDef - Symbol definition
   * @param {Object} styleColors - Token overrides
   * @param {Object} mapStyle - Current map style config (provides selectedColor, haloColor)
   * @returns {string} Resolved SVG string
   */
  resolveSelected (symbolDef, styleColors, mapStyle) {
    const colors = resolveValues(symbolDef, styleColors || {}, mapStyle)
    if (!symbolDef) { return '' }
    return resolveLayer(symbolDef.svg, colors)
  },

  // ─── Image IDs ────────────────────────────────────────────────────────────────

  /**
   * Returns a deterministic image ID for a symbol in normal or selected state.
   * Based on the hash of the fully resolved SVG content and the pixel ratio.
   *
   * @param {Object} dataset
   * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
   * @param {boolean} [selected=false]
   * @param {number} [pixelRatio=2] - Device pixel ratio × map size scale factor
   * @returns {string|null}
   */
  getSymbolImageId (dataset, mapStyle, selected = false, pixelRatio = 2) {
    const symbolDef = this.getSymbolDef(dataset)
    if (!symbolDef) {
      return null
    }
    const styleColors = getSymbolStyleColors(dataset)
    const resolved = selected
      ? this.resolveSelected(symbolDef, styleColors, mapStyle)
      : this.resolve(symbolDef, styleColors, mapStyle)
    return `symbol-${selected ? 'sel-' : ''}${hashString(resolved)}-${pixelRatio}x`
  },

  /**
   * Resolves the symbolDef for a dataset's symbol config.
   *
   * dataset.symbol is a string symbol ID (e.g. 'pin').
   * dataset.symbolSvgContent is inline SVG content for a custom symbol.
   *
   * @param {Object} dataset
   * @returns {Object|undefined}
   */
  getSymbolDef (dataset) {
    if (dataset.symbolSvgContent) {
      return { svg: dataset.symbolSvgContent }
    }
    if (dataset.symbol) {
      return this.get(dataset.symbol)
    }
    return undefined
  },

  /**
 * Register normal and selected symbol images for the given pre-resolved symbol configs.
 * Skips images that are already registered (safe to call on style change).
 * Updates `map._symbolImageMap` with normal→selected image ID pairs.
 *
 * Callers are responsible for resolving sublayers before calling this function
 * (see `getSymbolConfigs` in the datasets plugin adapter).
 *
 * @param {Object} map - MapLibre map instance
 * @param {Object[]} styleArray - Flat list of datasets/merged-sublayers that have a symbol config
 * @param {Object} mapStyle - Current map style config (provides id, selectedColor, haloColor)
 * @param {Object} symbolRegistry
 * @param {number} [pixelRatio=2] - Device pixel ratio × map size scale factor (computed by caller)
 * @returns {Promise<void>}
 */
  async addSymbolsToMap (map, styleArray, mapStyle, pixelRatio = 2) {
    if (!styleArray.length) {
      return
    }

    // Reset the normal→selected image ID lookup so stale entries don't persist after a style change
    map._symbolImageMap = {}

    await Promise.all(styleArray.flatMap(config => {
      const normalId = this.getSymbolImageId(config, mapStyle, false, pixelRatio)
      const selectedId = this.getSymbolImageId(config, mapStyle, true, pixelRatio)
      if (normalId && selectedId) {
        map._symbolImageMap[normalId] = selectedId
      }
      return [false, true].map(async (selected) => {
        const imageId = selected ? selectedId : normalId
        if (!imageId || map.hasImage(imageId)) {
          return
        }
        const result = await this.rasteriseSymbolImage(config, mapStyle, selected, pixelRatio)
        if (result && !map.hasImage(result.imageId)) {
          map.addImage(result.imageId, result.imageData, { pixelRatio })
        }
      })
    }))
  },

  // ─── Rasterisation ────────────────────────────────────────────────────────────

  async rasteriseSymbolImage (dataset, mapStyle, selected, pixelRatio) {
    const symbolDef = this.getSymbolDef(dataset)
    if (!symbolDef) {
      return null
    }
    const styleColors = getSymbolStyleColors(dataset)
    const resolvedContent = selected
      ? symbolRegistry.resolveSelected(symbolDef, styleColors, mapStyle)
      : symbolRegistry.resolve(symbolDef, styleColors, mapStyle)

    const imageId = `symbol-${selected ? 'sel-' : ''}${hashString(resolvedContent)}-${pixelRatio}x`

    let imageData = imageDataCache.get(imageId)
    if (!imageData) {
      const viewBox = getSymbolViewBox(dataset, symbolDef)
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

symbolRegistry.register(pin)
symbolRegistry.register(circle)
symbolRegistry.register(square)
