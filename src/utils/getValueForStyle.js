/**
 * Returns the appropriate color or other value for the given mapStyleId.
 * Supports:
 *  - Simple string colors (#fff, rgba(...))
 *  - Numbers
 *  - Object maps of mapStyleId → color or number
 *
 * @param {string|number|object} colors - Color string, number or style-mapped object of either
 * @param {string} mapStyleId - Current style/theme identifier
 * @returns {string|number|null}
 */
export const getValueForStyle = (colors, mapStyleId) => {
  if (typeof colors === 'number') {
    return colors
  }

  if (!colors) {
    return null
  }

  // --- Case 1: simple string color
  if (typeof colors === 'string') {
    return colors.trim()
  }

  // --- Case 2: mapped color object
  if (typeof colors === 'object') {
    // Style-specific match
    if (mapStyleId && colors[mapStyleId] != null) {
      return colors[mapStyleId]
    }

    // Fallback: first key’s value
    const firstValue = Object.values(colors)[0]
    return firstValue ?? null
  }

  return null
}
