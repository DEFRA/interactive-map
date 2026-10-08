import { BUILT_IN_PATTERNS } from '../config/patternConfig.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'
import { KEY_BORDER_PATH, getEffectivePixelRatio, injectColors } from '../utils/patternUtils.js'
import { rasteriseToImageData } from '../utils/rasteriseToImageData.js'
import { hashString } from '../utils/hashString.js'
import { createImageDataCache } from '../utils/imageDataCache.js'

// Shared by every registry: imageId → ImageData. Every style or pixel-ratio change brings new
// ids, so it's bounded.
const IMAGE_DATA_CACHE_SIZE = 128
const imageDataCache = createImageDataCache(IMAGE_DATA_CACHE_SIZE)

const PATTERN_VIEWBOX_SIZE = 16 // patterns are authored in a 16×16 space...
const PATTERN_TILE_SIZE = 8 // ...and tiled at 8 CSS pixels

// Colouring, image ids and rasterising. They read the registry only through `this` (its
// registered patterns), so every registry shares them.
const patternImageMethods = {
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
   * @param {number} pixelRatio - Device pixel ratio × map size scale factor
   * @returns {string|null}
   */
  getPatternImageId (dataset, mapStyleId, pixelRatio) {
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
   * Rasterise a pattern to ImageData, cached by imageId — shared by MapLibre's map.addImage()
   * and OpenLayers' CanvasPattern (canvasPatternStyle.js). Note: the two currently render the
   * pattern tile at different on-screen sizes (8px vs 16px CSS) — not yet confirmed if that
   * needs aligning.
   *
   * @param {Object} style - Dataset or marker config with fillPattern* properties
   * @param {string} mapStyleId - Current style/theme identifier
   * @param {number} pixelRatio - Device pixel ratio × map size scale factor
   * @returns {Promise<{imageId: string, imageData: ImageData}|null>}
   */
  async rasterisePatternImage (style, mapStyleId, pixelRatio) {
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
      const bgRect = `<rect width="${PATTERN_VIEWBOX_SIZE}" height="${PATTERN_VIEWBOX_SIZE}" fill="${bg}"/>`
      const physicalSize = Math.round(PATTERN_TILE_SIZE * getEffectivePixelRatio(pixelRatio))
      const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${physicalSize}" height="${physicalSize}" viewBox="0 0 ${PATTERN_VIEWBOX_SIZE} ${PATTERN_VIEWBOX_SIZE}">${bgRect}${colored}</svg>`
      imageData = await imageDataCache.rasteriseOnce(imageId, () => rasteriseToImageData(svgString, physicalSize, physicalSize))
    }
    return { imageId, imageData }
  }
}

/**
 * Creates a pattern registry: the built-in fill patterns plus any registered custom ones. Each
 * map instance has its own, so maps on the same page can register different patterns.
 *
 * @returns {Object} the registry
 */
export const createPatternRegistry = () => {
  const patterns = new Map()

  const registry = {
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

    /**
     * Registers the built-in patterns. Called when the registry is created.
     */
    initialise () {
      Object.entries(BUILT_IN_PATTERNS).forEach(([id, svgContent]) => {
        this.register(id, svgContent)
      })
    },

    ...patternImageMethods
  }

  registry.initialise()
  return registry
}
