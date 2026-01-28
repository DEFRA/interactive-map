import { graphicToGeoJSON } from '../graphic.js'

export const editFeature = ({ pluginState, mapProvider }, featureId) => {
  const { dispatch } = pluginState
  const { sketchViewModel, sketchLayer } = mapProvider

  // Graphic must already exist on sketchLayer
  const graphic = sketchLayer.graphics.items.find(g => g.attributes.id === featureId)

  // Fit view to extent of feature
  const extent = graphic.geometry.extent
  const bounds = [extent.xmin, extent.ymin, extent.xmax, extent.ymax]
  mapProvider.fitToBounds(bounds)

  // Enter update mode
  sketchViewModel.layer = sketchLayer
  sketchViewModel.update(graphic, {
    tool: 'reshape',
    toggleToolOnClick: false,
    enableRotation: false,
    enableScaling: false 
  })

  // Set original feature
  const feature = graphicToGeoJSON(graphic)
  dispatch({ type: 'SET_FEATURE', payload: { feature }})

  dispatch({ type: 'SET_MODE', payload: 'edit-feature' })
}