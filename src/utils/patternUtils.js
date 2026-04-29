// Border path rendered behind the pattern content in Key panel symbols (20×20 coordinate space).
export const KEY_BORDER_PATH = '<path d="M19 2.862v14.275c0 1.028-.835 1.862-1.862 1.862H2.863c-1.028 0-1.862-.835-1.862-1.862V2.862C1.001 1.834 1.836 1 2.863 1h14.275C18.166 1 19 1.835 19 2.862z" fill="{{backgroundColor}}" stroke="{{foregroundColor}}" stroke-width="2"/>'
// Minimum oversampling — keeps 16×16 physical pixels as the floor so patterns remain crisp.
export const PATTERN_MIN_PIXEL_RATIO = 2

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
