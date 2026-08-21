import { logger } from '../../../../src/services/logger.js'

const ADAPTER_METHOD_FOR_DIRECTION = {
  front: 'moveToFront',
  back: 'moveToBack',
  forward: 'moveForward',
  backward: 'moveBackward'
}

// direction is one of 'front' | 'back' | 'forward' | 'backward'.
export const reorderFeature = ({ mapProvider, services }, featureId, direction) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return false
  }

  if (!draw.get(featureId)) {
    logger.warn('reorderFeature: no feature found for id', featureId)
    return false
  }

  const adapterMethod = ADAPTER_METHOD_FOR_DIRECTION[direction]
  if (!adapterMethod) {
    logger.warn('reorderFeature: invalid direction', direction)
    return false
  }

  draw[adapterMethod](featureId)
  eventBus.emit('draw:orderchange', { order: draw.getOrder() })
  return true
}
