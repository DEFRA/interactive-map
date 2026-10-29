import { logger } from '../../../../src/services/logger.js'
import { definedOnly, isStyleProperty } from './flattenStyleProperties.js'
import { isInternalProperty } from './stripInternalProperties.js'

/**
 * Shallow-merges data properties into a feature in draw's store, with the new values
 * winning. A property whose value is undefined is left out; null is kept, so a value can
 * be cleared. Draw's internal properties, and style properties (set through setStyle,
 * which restyles the shape), are refused with a warning.
 *
 * @param {object} draw - the draw adapter
 * @param {string} featureId
 * @param {object} properties
 * @param {object} options
 * @param {string} options.caller - named in the warning, e.g. 'setProperties'
 * @param {string[]} [options.styleIds] - the known map style ids, see mapStyleIds
 * @returns {object} the properties that were applied
 */
export const mergeFeatureProperties = (draw, featureId, properties, { caller, styleIds = [] }) => {
  const applied = {}
  const refused = []
  for (const [key, value] of Object.entries(definedOnly(properties))) {
    if (isInternalProperty(key) || isStyleProperty(key, styleIds)) {
      refused.push(key)
    } else {
      applied[key] = value
    }
  }
  if (refused.length) {
    logger.warn(`${caller}: ignoring internal and style properties — use setStyle for style`, refused)
  }
  if (Object.keys(applied).length) {
    draw.setProperties(featureId, applied)
  }
  return applied
}
