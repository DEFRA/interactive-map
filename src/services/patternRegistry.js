import { BUILT_IN_PATTERNS } from '../config/patternConfig.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'
import { KEY_BORDER_PATH, getEffectivePixelRatio, injectColors, hashString } from '../utils/patternUtils.js'
import { rasteriseToImageData } from '../utils/rasteriseToImageData.js'
const patterns = new Map()
// Module-level cache: imageId → ImageData. Avoids re-rasterising identical patterns.
const imageDataCache = new Map()

export const patternRegistry = {
  /**
   * Register a named pattern.
   *
   * @param {string} id - Unique pattern name (e.g. 'my-hatch')
   * @param {string} svgContent - Inner SVG path content in a 16×16 coordinate space.
   *   Use {{foregroundColor}} and {{backgroundColor}} tokens for colour injection.
   */
  register (id, svgContent) {
    patterns.set(id, { id, svgContent })
  },

  /**
   * Retrieve a registered pattern by name.
   *
   * @param {string} id
   * @returns {{ id: string, svgContent: string }|undefined}
   */
  get (id) {
    return patterns.get(id)
  },

  /**
   * Returns all registered patterns.
   *
   * @returns {{ id: string, svgContent: string }[]}
   */
  list () {
    return [...patterns.values()]
  },

  /**
   * Clears all registered patterns (including built-ins). Mainly for testing purposes.
   */
  clear () {
    patterns.clear()
  },

  initialise () {
    // Seed built-in patterns
    Object.entries(BUILT_IN_PATTERNS).forEach(([id, svgContent]) => {
      this.register(id, svgContent)
    })
  },

  /**
   * Returns the raw (un-coloured) inner SVG content for a style's pattern.
   * Precedence: inline fillPatternSvgContent → named fillPattern from registry.
   *
   * @param {Object} style
   * @returns {string|null}
   */
  getPatternInnerContent (style) {
    if (style.fillPatternSvgContent) {
      return style.fillPatternSvgContent
    }
    if (style.fillPattern) {
      return this.get(style.fillPattern)?.svgContent ?? null
    }
    return null
  },

  /**
 * Returns colour-injected SVG path content for use in Key panel pattern symbols.
 * Returns { border, content } where border is the rounded-rect outline and content
 * is the pattern fill. Returns null if the style has no pattern.
 *
 * @param {Object} style
 * @param {string} mapStyleId
 * @returns {{ border: string, content: string }|null}
 */
  getKeyPatternPaths (style, mapStyleId) {
    const innerContent = this.getPatternInnerContent(style)
    if (!innerContent) {
      return null
    }
    const fg = getValueForStyle(style.fillPatternForegroundColor, mapStyleId) || 'black'
    const bg = getValueForStyle(style.fillPatternBackgroundColor, mapStyleId) || 'transparent'
    const borderStroke = getValueForStyle(style.stroke, mapStyleId) || fg
    const keyPatternPaths = {
      border: injectColors(KEY_BORDER_PATH, borderStroke, bg),
      content: injectColors(innerContent, fg, bg)
    }
    return keyPatternPaths
  },

  /**
 * Returns a deterministic image ID for a pattern + resolved colour + pixel ratio combination.
 *
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @param {number} [pixelRatio=1]
 * @returns {string|null}
 */
  getPatternImageId (dataset, mapStyleId, pixelRatio = 1) {
    const innerContent = this.getPatternInnerContent(dataset)
    if (!innerContent) {
      return null
    }
    const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
    const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
    const effectiveRatio = getEffectivePixelRatio(pixelRatio)
    return `pattern-${hashString(innerContent + fg + bg)}-${effectiveRatio}x`
  },

  /**
   * Rasterise a pattern to ImageData for use as a provider-native pattern image — MapLibre's
   * map.addImage() (see providers/maplibre/src/utils/patternImages.js) or a real CanvasPattern
   * for OpenLayers (see plugins/datasets/src/adapters/openlayers/canvasPatternStyle.js — OL has
   * no flat-style pattern path that can hold more source detail than its display size, so it
   * bypasses flat-style entirely for this). Results are cached by imageId so identical patterns
   * are only rendered once, mirroring symbolRegistry.rasteriseSymbolImage.
   *
   * The rendered tile is always 8×8 logical/CSS pixels for MapLibre, which hints its own
   * pixelRatio to addImage. OpenLayers' CanvasPattern instead divides back down by the raw
   * pixelRatio at display time (see canvasPatternStyle.js's module doc), which nets out to a
   * constant 16×16 logical/CSS pixels instead — i.e. the same style renders at a different
   * on-screen pattern-tile size per adapter. Not yet confirmed whether that's acceptable or
   * needs aligning; check both renderers side by side before relying on either constant.
   *
   * @param {Object} style - Dataset or marker config with fillPattern* properties
   * @param {string} mapStyleId - Current style/theme identifier
   * @param {number} [pixelRatio=1] - Device pixel ratio × map size scale factor
   * @returns {Promise<{imageId: string, imageData: ImageData}|null>}
   */
  async rasterisePatternImage (style, mapStyleId, pixelRatio = 1) {
    const innerContent = this.getPatternInnerContent(style)
    if (!innerContent) {
      return null
    }
    const imageId = this.getPatternImageId(style, mapStyleId, pixelRatio)
    if (!imageId) {
      return null
    }
    let imageData = imageDataCache.get(imageId)
    if (!imageData) {
      const fg = getValueForStyle(style.fillPatternForegroundColor, mapStyleId) || 'black'
      const bg = getValueForStyle(style.fillPatternBackgroundColor, mapStyleId) || 'transparent'
      const colored = injectColors(innerContent, fg, bg)
      const bgRect = `<rect width="16" height="16" fill="${bg}"/>`
      const effectiveRatio = getEffectivePixelRatio(pixelRatio)
      const physicalSize = Math.round(8 * effectiveRatio)
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${physicalSize}" height="${physicalSize}" viewBox="0 0 16 16">${bgRect}${colored}</svg>`
      imageData = await rasteriseToImageData(svgString, physicalSize, physicalSize)
      imageDataCache.set(imageId, imageData)
    }
    return { imageId, imageData }
  }
}

patternRegistry.initialise() // Seed built-in patterns
