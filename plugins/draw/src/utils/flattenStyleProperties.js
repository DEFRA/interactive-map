const STYLE_PROPS = new Set(['stroke', 'fill', 'strokeWidth'])

const capitalise = (id) => id.charAt(0).toUpperCase() + id.slice(1)

export const flattenStyleProperties = (props) => {
  if (!props) {
    return {}
  }

  const result = {}

  for (const [key, value] of Object.entries(props)) {
    if (STYLE_PROPS.has(key) && typeof value === 'object' && value !== null) {
      const entries = Object.entries(value)
      if (entries.length > 0) {
        result[key] = entries[0][1]
      }
      for (const [styleId, styleValue] of entries) {
        result[`${key}${capitalise(styleId)}`] = styleValue
      }
    } else {
      result[key] = value
    }
  }

  return result
}

// Drops keys whose value is undefined — a key left out of a patch must not blank out
// whatever the feature already has.
export const definedOnly = (properties = {}) => {
  const result = {}
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

// The IDs of the map styles a per-style value can be for (mapState.mapStyles)
export const mapStyleIds = (mapState) => mapState?.mapStyles?.map((mapStyle) => mapStyle.id) ?? []

/**
 * The flattened patch for changing a feature's style props. Setting a style prop replaces
 * all of its values: the feature's existing keys for that prop in each map style come back
 * as undefined, meaning remove, so an old strokeOutdoor can't outrank a new single stroke.
 * Only keys for known map styles are removed, so a data property such as fillType is never
 * touched. Props left out or undefined in `changes` are untouched.
 *
 * @param {object} existing - the feature's current (flattened) properties
 * @param {object} changes - stroke/fill/strokeWidth, each a value or a per-style object
 * @param {string[]} styleIds - see mapStyleIds
 * @returns {object}
 */
export const toStyleChanges = (existing = {}, changes = {}, styleIds = []) => {
  const defined = definedOnly(changes)
  const removed = {}
  for (const prop of Object.keys(defined)) {
    if (!STYLE_PROPS.has(prop)) { continue }
    for (const styleId of styleIds) {
      const key = `${prop}${capitalise(styleId)}`
      if (key in existing) { removed[key] = undefined } // NOSONAR — undefined means remove (see setStyle in both adapters); null is a real value to keep
    }
  }
  return { ...removed, ...flattenStyleProperties(defined) }
}
