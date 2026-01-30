import { DEFAULT } from '../config.js'
import { convertFeatureToBounds, getFeatureAspectRatio } from '../utils.js'

export const editFeature = ({ pluginConfig, pluginState, mapProvider, services }, feature, config = {}) => {
  const { dispatch } = pluginState
  const { eventBus } = services

  // Calculate bounds from feature geometry
  const bounds = convertFeatureToBounds(feature)

  // Calculate aspect ratio from feature geometry
  const aspectRatio = getFeatureAspectRatio(feature, mapProvider)

  // Merge frame config
  const frame = {
    ...DEFAULT,
    ...pluginConfig,
    ...config,
    aspectRatio,
    featureId: feature?.id || feature.properties.id
  }

  // Store frame with bounds in plugin state
  dispatch({ type: 'SET_FRAME', payload: { ...frame, bounds } })

  eventBus.emit('frame:edit')
}