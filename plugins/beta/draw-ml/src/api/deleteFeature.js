export const deleteFeature = ({ mapProvider, services }, featureIds) => {
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  // --- Delete features from draw instance
  draw.delete(featureIds)

  eventBus.emit('draw:delete', { featureIds })
}