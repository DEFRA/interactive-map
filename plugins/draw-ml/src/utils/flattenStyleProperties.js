const STYLE_PROPS = ['stroke', 'fill', 'strokeWidth']

/**
 * Flatten style properties that may be strings or variant objects
 * keyed by style ID into flat GeoJSON-compatible properties.
 *
 * @param {object} props - Object containing style properties
 * @returns {object} Flattened properties
 *
 * @example
 * flattenStyleProperties({
 *   stroke: { outdoor: '#e6c700', dark: '#ffd700' },
 *   fill: 'rgba(255, 221, 0, 0.1)',
 *   strokeWidth: 3
 * })
 * // Returns:
 * // {
 * //   stroke: '#e6c700',
 * //   strokeOutdoor: '#e6c700',
 * //   strokeDark: '#ffd700',
 * //   fill: 'rgba(255, 221, 0, 0.1)',
 * //   strokeWidth: 3
 * // }
 */
export const flattenStyleProperties = (props) => {
  if (!props) {
    return {}
  }

  const result = {}

  for (const [key, value] of Object.entries(props)) {
    if (STYLE_PROPS.includes(key) && typeof value === 'object' && value !== null) {
      const entries = Object.entries(value)
      // First value as base fallback
      if (entries.length > 0) {
        result[key] = entries[0][1]
      }
      // Variant properties: e.g. strokeDark, fillOutdoor
      for (const [styleId, styleValue] of entries) {
        result[`${key}${styleId.charAt(0).toUpperCase() + styleId.slice(1)}`] = styleValue
      }
    } else {
      result[key] = value
    }
  }

  return result
}
