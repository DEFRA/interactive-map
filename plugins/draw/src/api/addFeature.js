import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

export const addFeature = ({ mapProvider, services }, feature) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  const { stroke, fill, strokeWidth, properties, ...featureRest } = feature
  const flatFeature = {
    ...featureRest,
    properties: {
      ...properties,
      ...flattenStyleProperties({ stroke, fill, strokeWidth })
    }
  }

  draw.add(flatFeature)
  eventBus.emit('draw:add', flatFeature)
}
