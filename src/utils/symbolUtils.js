// Symbol style props in dataset style that carry token values.
// These use the 'symbol' prefix to distinguish them from fill/stroke props at the same level.
// The prefix is stripped before passing tokens to the registry (e.g. symbolBackgroundColor → backgroundColor).
const SYMBOL_STYLE_PROPS = new Set([
  'symbolBackgroundColor', 'symbolForegroundColor',
  'symbolHaloWidth', 'symbolGraphic'
])

/**
 * Returns true if this dataset should be rendered as a symbol (point) layer.
 * @param {Object} dataset
 * @returns {boolean}
 */
export const hasSymbol = (dataset) => !!(dataset.symbol || dataset.symbolSvgContent)

/**
 * Returns true if a marker item should render as a standalone label with no symbol.
 * Requires label content and at least one of symbol/symbolSvgContent to be explicitly null.
 * Undefined values fall through to render-time default symbol resolution.
 *
 * @param {Object} marker
 * @returns {boolean}
 */
export const isStandaloneLabel = (marker) => {
  if (!marker.label) {
    return false
  }
  if (marker.symbol || marker.symbolSvgContent) {
    return false
  }
  return marker.symbol === null || marker.symbolSvgContent === null
}

/**
 * Resolves the symbolDef for a dataset's symbol config.
 *
 * dataset.symbol is a string symbol ID (e.g. 'pin').
 * dataset.symbolSvgContent is inline SVG content for a custom symbol.
 *
 * @param {Object} dataset
 * @param {Object} symbolRegistry
 * @returns {Object|undefined}
 */
export const getSymbolDef = (dataset, symbolRegistry) => {
  if (dataset.symbolSvgContent) {
    return { svg: dataset.symbolSvgContent }
  }
  if (dataset.symbol) {
    return symbolRegistry.get(dataset.symbol)
  }
  return undefined
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
 * Returns the viewBox string for a dataset's symbol.
 * Precedence: dataset.symbolViewBox → symbolDef viewBox → default.
 *
 * @param {Object} dataset
 * @param {Object|undefined} symbolDef
 * @returns {string}
 */
export const getSymbolViewBox = (dataset, symbolDef) => {
  if (dataset.symbolViewBox) {
    return dataset.symbolViewBox
  }
  return symbolDef?.viewBox ?? '0 0 38 38'
}

/**
 * Returns the anchor for a dataset's symbol as [x, y] in 0–1 space.
 * Precedence: dataset.symbolAnchor → symbolDef anchor → [0.5, 0.5].
 *
 * @param {Object} dataset
 * @param {Object|undefined} symbolDef
 * @returns {number[]}
 */
export const getSymbolAnchor = (dataset, symbolDef) => {
  if (dataset.symbolAnchor) {
    return dataset.symbolAnchor
  }
  return symbolDef?.anchor ?? [0.5, 0.5]
}
