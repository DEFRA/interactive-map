import { createGraphic } from '../graphic.js'

export const addFeature = ({ pluginState, mapState, mapProvider, services }, feature) => {
  const { dispatch } = pluginState
  const { mapStyle } = mapState
  const { sketchViewModel, sketchLayer, emptySketchLayer } = mapProvider
  const { eventBus } = services

  const graphic = createGraphic(feature.id, feature.geometry.coordinates, mapStyle.mapColorScheme)
  
  // Add the graphic to the layer
  sketchLayer.add(graphic)

  // Prevent selection with empty layer
  sketchViewModel.layer = emptySketchLayer

  // Store initial feature in plugin state
  dispatch({ type: 'SET_FEATURE', payload: { feature }})

  eventBus.emit('draw:add', feature)
}