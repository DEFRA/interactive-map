import { graphicToGeoJSON } from '../graphic.js'
import { removeSafeZone } from './removeSafeZone.js'

export const editFeature = ({ appState, pluginState, mapProvider }, featureId) => {
  const { dispatch } = pluginState
  const { sketchViewModel, sketchLayer, view } = mapProvider

  // Graphic must already exist on sketchLayer
  const graphic = sketchLayer.graphics.items.find(g => g.attributes.id === featureId)

  // Fit view to extent of feature
  const extent = graphic.geometry.extent.clone()

  // Reset view padding to avoid a dead zone around the feature that can't be edited.
  // Ensure that the safe zone inset is updated too, as they need to remain in sync.
  removeSafeZone(view, appState.dispatch)
  // increase the extents by a factor of 2 to add a margin around the feature
  extent.expand(2.0)
  // Move the map to the expanded extents of the feature
  view.goTo(extent)

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
  dispatch({ type: 'SET_FEATURE', payload: { feature } })

  dispatch({ type: 'SET_MODE', payload: 'edit-feature' })
}
