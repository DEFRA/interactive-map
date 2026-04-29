import { BUILT_IN_PATTERNS } from '../config/patternConfig.js'
import { getValueForStyle } from '../utils/getValueForStyle.js'
import { KEY_BORDER_PATH, PATTERN_MIN_PIXEL_RATIO, injectColors, hashString } from '../utils/patternUtils.js'
const patterns = new Map()

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
    const effectiveRatio = Math.max(PATTERN_MIN_PIXEL_RATIO, pixelRatio)
    return `pattern-${hashString(innerContent + fg + bg)}-${effectiveRatio}x`
  }
}

// Seed built-in patterns
Object.entries(BUILT_IN_PATTERNS).forEach(([id, svgContent]) => {
  patternRegistry.register(id, svgContent)
})
