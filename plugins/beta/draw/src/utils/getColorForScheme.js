/**
 * Resolve a configuration value which may be either a simple value (same for all styles)
 * or an object with scheme/style variants.
 *
 * Useful for resolving any value (colors, sizes, etc.) across different map styles and color schemes.
 * Can resolve based on both style ID and color scheme.
 *
 * Resolution order for objects:
 * 1. Exact style ID match (e.g., { outdoor: '...', dark: '...' })
 * 2. Scheme match (e.g., { light: '...', dark: '...' })
 * 3. Fallback to 'light' property
 * 4. First value in object
 *
 * @param {any} value - Simple value or variant object
 * @param {string} scheme - Current color scheme ('light' or 'dark')
 * @param {string|null} styleId - Map style ID for per-style customization
 * @returns {any} Resolved value
 */
export const getValueForStyle = (value, scheme, styleId = null) => {
  if (typeof value !== 'object' || value === null) {
    return value
  }
  if (styleId && value[styleId] !== undefined) {
    return value[styleId]
  }
  if (value[scheme] !== undefined) {
    return value[scheme]
  }
  if (value.light !== undefined) {
    return value.light
  }
  return Object.values(value)[0]
}

// Legacy alias for backwards compatibility
export const getColorForScheme = getValueForStyle
