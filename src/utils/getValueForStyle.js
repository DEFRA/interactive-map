/**
 * Returns the appropriate color for the given mapStyleId.
 * Supports:
 *  - Simple string colors (#fff, rgba(...))
 *  - Object maps of mapStyleId → color
 *
 * @param {string|object} colors - Color string or style-mapped color object
 * @param {string} mapStyleId - Current style/theme identifier
 * @returns {string|null}
 */
export const getValueForStyle = (colors, mapStyleId) => {
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
    if (mapStyleId && colors[mapStyleId]) {
      return colors[mapStyleId]
    }

    // Fallback: first key’s value
    const firstValue = Object.values(colors)[0]
    return firstValue ?? null
  }

  return null
}
