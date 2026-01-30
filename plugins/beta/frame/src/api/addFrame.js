import { DEFAULT } from '../config.js'

export const addFrame = ({ pluginConfig, pluginState, services }, featureId, config = {}) => {
  const { dispatch } = pluginState
  const { eventBus } = services

  // Merge defaults
  const frame = {
    ...DEFAULT,
    ...pluginConfig,
    ...config,
    featureId
  }

  dispatch({ type: 'SET_FRAME', payload: frame })

  eventBus.emit('frame:add')
}