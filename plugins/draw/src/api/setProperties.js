import { mergeFeatureProperties } from '../utils/mergeFeatureProperties.js'
import { mapStyleIds } from '../utils/flattenStyleProperties.js'
import { isEditMode } from '../utils/drawModes.js'
import { logger } from '../../../../src/services/logger.js'

/**
 * Merge data properties into an existing feature. See mergeFeatureProperties for the rules:
 * a shallow merge, undefined left out, null kept, internal and style properties refused.
 *
 * @param {object} context - plugin context
 * @param {string} featureId
 * @param {object} properties
 * @returns {boolean} false if the feature doesn't exist
 */
export const setProperties = ({ pluginState, mapState, mapProvider, services }, featureId, properties = {}) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return false
  }

  if (!draw.get(featureId)) {
    logger.warn('setProperties: no feature found for id', featureId)
    return false
  }

  const applied = mergeFeatureProperties(draw, featureId, properties, { caller: 'setProperties', styleIds: mapStyleIds(mapState) })

  // Cancelling an edit puts back the feature as it was when the edit started, so that copy
  // gets the properties too — they aren't part of the edit.
  const { feature: editStart, dispatch } = pluginState
  if (isEditMode(draw.getMode()) && editStart?.id === featureId) {
    dispatch({ type: 'SET_FEATURE', payload: { feature: { ...editStart, properties: { ...editStart.properties, ...applied } } } })
  }

  eventBus.emit('draw:propertieschange', { featureId, properties: applied })
  return true
}
