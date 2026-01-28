export const deleteFeature = ({ pluginState, mapProvider, services }, featureId) => {
  const { dispatch } = pluginState
  const { sketchViewModel, sketchLayer, emptySketchLayer } = mapProvider
  const { eventBus } = services

  // Graphic must already exist on sketchLayer
  const graphic = sketchLayer.graphics.items.find(g => g.attributes.id === featureId)

  // Cancel and remove the graphic
  sketchViewModel.cancel()
  sketchLayer.remove(graphic)
  sketchViewModel.layer = emptySketchLayer
  
  // Reset state
  dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null }})

  // Emit event
  eventBus.emit('draw:delete', { featureId })

  // Clear mode
  dispatch({ type: 'SET_MODE', payload: null })
}