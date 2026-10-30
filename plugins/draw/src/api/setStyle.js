import { toStyleChanges, definedOnly, mapStyleIds } from '../utils/flattenStyleProperties.js'
import { logger } from '../../../../src/services/logger.js'

const STYLE_KEYS = new Set(['stroke', 'fill', 'strokeWidth'])

// A removed key is reported as null, so a page that merges the payload into its saved copy
// of the feature clears it too
const toPayload = (changes) =>
  Object.fromEntries(Object.entries(changes).map(([key, value]) => [key, value === undefined ? null : value]))

export const setStyle = ({ mapState, mapProvider, services }, featureId, styleChanges = {}) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return false
  }

  const feature = draw.get(featureId)
  if (!feature) {
    logger.warn('setStyle: no feature found for id', featureId)
    return false
  }

  const styleProps = {}
  const symbolProps = {}
  for (const [key, value] of Object.entries(styleChanges)) {
    (STYLE_KEYS.has(key) ? styleProps : symbolProps)[key] = value
  }
  // A partial patch: style keys left out stay as they are. Setting one replaces all of its
  // per-style values, which reach the adapter as undefined, meaning remove.
  const changes = {
    ...toStyleChanges(feature.properties, styleProps, mapStyleIds(mapState)),
    ...definedOnly(symbolProps)
  }

  draw.setStyle(featureId, changes)
  eventBus.emit('draw:stylechange', { featureId, properties: toPayload(changes) })
  return true
}
