// -----------------------------------------------------------------------------
// Internal helpers
// -----------------------------------------------------------------------------

function parseAttribute (attr) {
  try {
    return JSON.parse(attr)
  } catch (err) {
    console.log(err)
    return null
  }
}

// -----------------------------------------------------------------------------
// Public
// -----------------------------------------------------------------------------

/**
 * Parses all `data-*` attributes from a DOM element into an object,
 * converting JSON strings to JavaScript values where possible.
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
