/**
 * Resolve a color value which may be either a string (same for all schemes)
 * or an object with scheme/style variants.
 *
 * Resolution order for objects:
 * 1. Exact style ID match (e.g., { outdoor: '...', dark: '...' })
 * 2. Scheme match (e.g., { light: '...', dark: '...' })
 * 3. Fallback to 'light' property
 * 4. First value in object
 *
 * @param {string|object} colorValue - Color as string or variant object
 * @param {string} scheme - Current scheme ('light' or 'dark')
 * @param {string|null} styleId - Map style ID for per-style customization
 * @returns {string} Resolved color value
 */
export const getColorForScheme = (colorValue, scheme, styleId = null) => {
  if (typeof colorValue !== 'object' || colorValue === null) {
    return colorValue
  }
  if (styleId && colorValue[styleId] !== undefined) {
    return colorValue[styleId]
  }
  if (colorValue[scheme] !== undefined) {
    return colorValue[scheme]
  }
  if (colorValue.light !== undefined) {
    return colorValue.light
  }
  return Object.values(colorValue)[0]
}
