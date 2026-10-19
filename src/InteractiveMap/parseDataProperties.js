// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function parseAttribute (attr) {
  try {
    return JSON.parse(attr)
  } catch {
    return attr
  }
}

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

/**
 * Parses all `data-*` attributes from a DOM element into an object,
 * converting JSON strings to JavaScript values where possible. Values that
 * aren't valid JSON are returned as the original string.
 *
 * @param {HTMLElement} el - The element whose dataset will be parsed.
 * @returns {Object} An object containing the parsed data attributes.
 */
export function parseDataProperties (el) {
  const dataset = { ...el?.dataset }
  const parsed = {}
  for (const key of Object.keys(dataset)) {
    parsed[key] = parseAttribute(dataset[key])
  }
  return parsed
}
