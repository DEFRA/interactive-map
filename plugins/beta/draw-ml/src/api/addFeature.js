import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

export const addFeature = ({ mapProvider, services }, feature) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  // Extract style props from top level, flatten variants, merge with custom properties
  const { stroke, fill, strokeWidth, properties, ...rest } = feature
  const flatFeature = {
    ...rest,
    properties: {
      ...properties,
      ...flattenStyleProperties({ stroke, fill, strokeWidth })
    }
  }

  // --- Add feature to draw instance
  draw.add(flatFeature, {
    userProperties: true
  })

  eventBus.emit('draw:add', flatFeature)
}
