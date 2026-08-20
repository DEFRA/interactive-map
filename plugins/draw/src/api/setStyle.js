import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'
import { logger } from '../../../../src/services/logger.js'

const STYLE_KEYS = new Set(['stroke', 'fill', 'strokeWidth'])

// A partial patch — unlike addFeature.js building a whole new feature from scratch,
// flattenStyleProperties would otherwise write stroke/fill/strokeWidth as explicit
// `undefined` for any of the three the caller didn't mention, blanking out whatever that
// feature already had.
const definedOnly = (properties) => {
  const result = {}
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

export const setStyle = ({ mapProvider, services }, featureId, styleChanges = {}) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return false
  }

  if (!draw.get(featureId)) {
    logger.warn('setStyle: no feature found for id', featureId)
    return false
  }

  const styleProps = {}
  const symbolProps = {}
  for (const [key, value] of Object.entries(styleChanges)) {
    (STYLE_KEYS.has(key) ? styleProps : symbolProps)[key] = value
  }
  const properties = definedOnly({ ...flattenStyleProperties(styleProps), ...symbolProps })

  draw.setStyle(featureId, properties)
  eventBus.emit('draw:stylechange', { featureId, properties })
  return true
}
