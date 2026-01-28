export const deleteFeature = ({ mapProvider, services }, featureId) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  // --- Delete feature from draw instance
  draw.delete(featureId)

  eventBus.emit('draw:delete', { featureId })
}