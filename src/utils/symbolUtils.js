import { SYMBOL_SIZES } from '../config/symbolConfig.js'
import { logger } from '../services/logger.js'

// Each unknown symbol size is reported once, rather than on every render
const reportedSizes = new Set()
const quoted = (text) => `'${text}'`

// Symbol style props in dataset style that carry token values.
// These use the 'symbol' prefix to distinguish them from fill/stroke props at the same level.
// The prefix is stripped before passing tokens to the registry (e.g. symbolBackgroundColor → backgroundColor).
const SYMBOL_STYLE_PROPS = new Set([
  'symbolBackgroundColor', 'symbolForegroundColor',
  'symbolHaloWidth', 'symbolGraphic'
])

/**
 * Whether a dataset or draw style draws a symbol: a `symbol` id or inline `symbolSvgContent`.
 * @param {Object} [style]
 * @returns {boolean}
 */
export const hasSymbol = (style) => !!(style?.symbol || style?.symbolSvgContent)

/**
 * Returns true if a marker item should render as a standalone label with no symbol.
 * Requires label content and at least one of symbol/svgContent to be explicitly null.
 * Undefined values fall through to render-time default symbol resolution.
 *
 * @param {Object} marker
 * @returns {boolean}
 */
export const isStandaloneLabel = (marker) => {
  if (!marker.label) {
    return false
  }
  if (marker.symbol || marker.svgContent) {
    return false
  }
  return marker.symbol === null || marker.svgContent === null
}

/**
 * Extracts token overrides from a dataset's flat symbol style props.
 * Strips the 'symbol' prefix to produce internal token names (e.g. symbolBackgroundColor → backgroundColor).
 * Returns an empty object when no symbol is configured.
 *
 * @param {Object} dataset
 * @returns {Object}
 */
export const getSymbolStyleColors = (dataset) => {
  if (!hasSymbol(dataset)) { return {} }
  const tokens = {}
  SYMBOL_STYLE_PROPS.forEach(key => {
    if (dataset[key] != null) {
      // Strip 'symbol' prefix: symbolBackgroundColor → backgroundColor
      const tokenKey = key.charAt(6).toLowerCase() + key.slice(7) // NOSONAR
      tokens[tokenKey] = dataset[key]
    }
  })
  return tokens
}

/**
 * Returns the scale factor for a symbol size ('small' | 'medium' | 'large'). Missing means
 * medium; an unknown value is warned about (once) and also treated as medium.
 * The one place a size becomes a number — extend here to accept other sizes or raw factors.
 *
 * @param {string} [size]
 * @returns {number}
 */
export const getSymbolScale = (size) => {
  if (size == null || Object.keys(SYMBOL_SIZES).includes(size)) {
    return SYMBOL_SIZES[size] ?? SYMBOL_SIZES.medium
  }
  if (!reportedSizes.has(size)) {
    reportedSizes.add(size)
    const expected = Object.keys(SYMBOL_SIZES).map(quoted).join(', ')
    logger.warn(`Unknown symbol size "${size}" — expected ${expected}. Using 'medium'.`)
  }
  return SYMBOL_SIZES.medium
}
