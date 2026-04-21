import { getValueForStyle } from '../utils/getValueForStyle.js'

// Border path rendered behind the pattern content in Key panel symbols (20×20 coordinate space).
export const KEY_BORDER_PATH = '<path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="{{backgroundColor}}" stroke="{{foregroundColor}}" stroke-width="2"/>'

export const hashString = (str) => {
  let hash = 0
  for (const ch of str) {
    hash = ((hash << 5) - hash) + ch.codePointAt(0)
    hash = hash & hash
  }
  return Math.abs(hash).toString(36) // NOSONAR: base36 encoding for compact alphanumeric hash string
}

/**
 * Replaces {{foregroundColor}} and {{backgroundColor}} tokens in SVG content with resolved colour values.
 *
 * @param {string} content - SVG path string with colour tokens
 * @param {string} foregroundColor
 * @param {string} backgroundColor
 * @returns {string}
 */
export const injectColors = (content, foregroundColor, backgroundColor) =>
  content
    .replace(/\{\{foregroundColor\}\}/g, foregroundColor || 'black')
    .replace(/\{\{backgroundColor\}\}/g, backgroundColor || 'transparent')

/**
 * Returns true if a dataset/config has a fill pattern configured.
 *
 * @param {Object} dataset
 * @returns {boolean}
 */
export const hasPattern = (dataset) => !!(dataset.fillPattern || dataset.fillPatternSvgContent)

/**
 * Returns the raw (un-coloured) inner SVG content for a dataset's pattern.
 * Precedence: inline fillPatternSvgContent → named fillPattern from registry.
 *
 * @param {Object} dataset
 * @param {Object} patternRegistry
 * @returns {string|null}
 */
export const getPatternInnerContent = (dataset, patternRegistry) => {
  if (dataset.fillPatternSvgContent) {
    return dataset.fillPatternSvgContent
  }
  if (dataset.fillPattern) {
    return patternRegistry?.get(dataset.fillPattern)?.svgContent ?? null
  }
  return null
}

/**
 * Returns a deterministic image ID for a pattern + resolved colour + pixel ratio combination.
 *
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @param {number} [pixelRatio=1]
 * @returns {string|null}
 */
// Minimum oversampling — keeps 16×16 physical pixels as the floor so patterns remain crisp.
export const PATTERN_MIN_PIXEL_RATIO = 2

export const getPatternImageId = (dataset, mapStyleId, patternRegistry, pixelRatio = 1) => {
  const innerContent = getPatternInnerContent(dataset, patternRegistry)
  if (!innerContent) {
    return null
  }
  const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
  const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
  const effectiveRatio = Math.max(PATTERN_MIN_PIXEL_RATIO, pixelRatio)
  return `pattern-${hashString(innerContent + fg + bg)}-${effectiveRatio}x`
}

/**
 * Returns colour-injected SVG path content for use in Key panel pattern symbols.
 * Returns { border, content } where border is the rounded-rect outline and content
 * is the pattern fill. Returns null if the dataset has no pattern.
 *
 * @param {Object} dataset
 * @param {string} mapStyleId
 * @param {Object} patternRegistry
 * @returns {{ border: string, content: string }|null}
 */
export const getKeyPatternPaths = (dataset, mapStyleId, patternRegistry) => {
  const innerContent = getPatternInnerContent(dataset, patternRegistry)
  if (!innerContent) {
    return null
  }
  const fg = getValueForStyle(dataset.fillPatternForegroundColor, mapStyleId) || 'black'
  const bg = getValueForStyle(dataset.fillPatternBackgroundColor, mapStyleId) || 'transparent'
  const borderStroke = getValueForStyle(dataset.stroke, mapStyleId) || fg
  return {
    border: injectColors(KEY_BORDER_PATH, borderStroke, bg),
    content: injectColors(innerContent, fg, bg)
  }
}
