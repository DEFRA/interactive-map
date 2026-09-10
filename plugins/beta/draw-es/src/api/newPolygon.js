import { createSymbol, graphicToGeoJSON } from '../graphic.js'
import { removeSafeZone } from './removeSafeZone.js'

export const newPolygon = ({ appState, mapState, pluginState, mapProvider, services }, featureId) => {
  const { dispatch } = pluginState
  const { sketchViewModel, sketchLayer, view } = mapProvider
  const { eventBus } = services

  // Set layer
  sketchViewModel.layer = sketchLayer

  // Reset view padding to avoid a dead zone around the feature that can't be edited.
  // Ensure that the safe zone inset is updated too, as they need to remain in sync.
  removeSafeZone(view, appState.dispatch)

  // One time event listener
  const handleCreateComplete = sketchViewModel.on('create', (e) => {
    if (e.state === 'complete') {
      e.graphic.attributes = { id: featureId }

      // Fix: to address calling some sketchViewModel methods syncronously
      requestAnimationFrame(() => {
        sketchViewModel.update(e.graphic, {
          tool: 'reshape',
          toggleToolOnClick: false
        })
      })

      // Store temp feature in state and emit create
      const tempFeature = graphicToGeoJSON(e.graphic)
      eventBus.emit('draw:created', tempFeature)
      dispatch({ type: 'SET_FEATURE', payload: { tempFeature } })

      handleCreateComplete.remove()
    }
  })

  sketchViewModel.polygonSymbol = createSymbol(mapState.mapStyle.mapColorScheme)
  sketchViewModel.create('polygon')

  dispatch({ type: 'SET_MODE', payload: 'new-polygon' })
  dispatch({ type: 'SET_FEATURE_ID', payload: featureId })
}
