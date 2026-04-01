// Keys in an object-form symbol config that are not token values
const SYMBOL_STRUCTURAL = new Set(['id', 'symbolSvgContent', 'viewBox', 'anchor'])

// Top-level dataset props (after style flattening) that are symbol token overrides
const DATASET_SYMBOL_TOKENS = new Set(['graphic'])

/**
 * Returns true if this dataset should be rendered as a symbol (point) layer.
 * @param {Object} dataset
 * @returns {boolean}
 */
export const hasSymbol = (dataset) => !!dataset.symbol

/**
 * Resolves the symbolDef for a dataset's symbol config.
 *
 * dataset.symbol may be:
 *   - a string: registered symbol ID, e.g. 'pin'
 *   - an object with symbolSvgContent: inline SVG definition
 *   - an object with id: look up from registry
 *
 * @param {Object} dataset
 * @param {Object} symbolRegistry
 * @returns {Object|undefined}
 */
export const getSymbolDef = (dataset, symbolRegistry) => {
  const { symbol } = dataset
  if (!symbol) { return undefined }
  if (typeof symbol === 'string') {
    return symbolRegistry.get(symbol)
  }
  if (symbol.symbolSvgContent) {
    return { svg: symbol.symbolSvgContent, ...symbol }
  }
  if (symbol.id) {
    return symbolRegistry.get(symbol.id)
  }
  return undefined
}

/**
 * Extracts token overrides from an object-form symbol config.
 * Structural keys (id, symbolSvgContent, viewBox, anchor) are excluded.
 * Returns an empty object for string-form symbol configs.
 *
 * @param {Object} dataset
 * @returns {Object}
 */
export const getSymbolStyleColors = (dataset) => {
  const { symbol } = dataset
  if (!symbol) { return {} }
  // Collect top-level token overrides from the flattened dataset (e.g. dataset.graphic)
  const tokens = {}
  DATASET_SYMBOL_TOKENS.forEach(key => {
    if (dataset[key] != null) { tokens[key] = dataset[key] }
  })
  if (typeof symbol === 'string') { return tokens }
  // For object-form symbol, also merge token overrides from within the symbol object
  Object.entries(symbol).forEach(([k, v]) => {
    if (!SYMBOL_STRUCTURAL.has(k)) { tokens[k] = v }
  })
  return tokens
}

/**
 * Returns the viewBox string for a dataset's symbol.
 * Precedence: object-form config viewBox → symbolDef viewBox → default.
 *
 * @param {Object} dataset
 * @param {Object|undefined} symbolDef
 * @returns {string}
 */
export const getSymbolViewBox = (dataset, symbolDef) => {
  if (typeof dataset.symbol === 'object' && dataset.symbol.viewBox) {
    return dataset.symbol.viewBox
  }
  return symbolDef?.viewBox ?? '0 0 38 38'
}

/**
 * Returns the anchor for a dataset's symbol as [x, y] in 0–1 space.
 * Precedence: object-form config anchor → symbolDef anchor → [0.5, 0.5].
 *
 * @param {Object} dataset
 * @param {Object|undefined} symbolDef
 * @returns {number[]}
 */
export const getSymbolAnchor = (dataset, symbolDef) => {
  if (typeof dataset.symbol === 'object' && dataset.symbol.anchor) {
    return dataset.symbol.anchor
  }
  return symbolDef?.anchor ?? [0.5, 0.5]
}
