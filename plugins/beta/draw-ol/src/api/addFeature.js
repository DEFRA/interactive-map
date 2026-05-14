/**
 * Add a pre-drawn feature (GeoJSON) to the draw layer.
 * The feature will be stored and available for editing.
 *
 * @param {object} context - plugin context
 * @param {object} feature - GeoJSON feature with id, geometry, properties
 */
export const addFeature = ({ mapProvider, services }, feature) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) return

  // Extract style properties from top level
  const { stroke, fill, strokeWidth, properties, ...featureRest } = feature
  const flatFeature = {
    ...featureRest,
    properties: {
      ...properties,
      ...(stroke && { stroke }),
      ...(fill && { fill }),
      ...(strokeWidth && { strokeWidth })
    }
  }

  draw.add(flatFeature)
  eventBus.emit('draw:add', flatFeature)
}
