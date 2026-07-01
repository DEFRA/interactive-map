const STYLE_PROPS = ['stroke', 'fill', 'strokeWidth']

export const flattenStyleProperties = (props) => {
  if (!props) {
    return {}
  }

  const result = {}

  for (const [key, value] of Object.entries(props)) {
    if (STYLE_PROPS.includes(key) && typeof value === 'object' && value !== null) {
      const entries = Object.entries(value)
      if (entries.length > 0) {
        result[key] = entries[0][1]
      }
      for (const [styleId, styleValue] of entries) {
        result[`${key}${styleId.charAt(0).toUpperCase() + styleId.slice(1)}`] = styleValue
      }
    } else {
      result[key] = value
    }
  }

  return result
}
