import { createSymbol, graphicToGeoJSON } from '../graphic.js'

export const newPolygon = ({ mapState, pluginState, mapProvider, services }, featureId) => {
  const { dispatch } = pluginState
  const { sketchViewModel, sketchLayer } = mapProvider
  const { eventBus } = services

  // Set layer
  sketchViewModel.layer = sketchLayer

  // One time event listener
  const handleCreateComplete = sketchViewModel.on('create', (e) => {
    if (e.state === 'complete') {
      e.graphic.attributes = { id: featureId }

      console.log('create-complete', mapProvider.sketchLayer.graphics.items.length)
      
      // Fix: to address calling some sketchViewModel methods syncronously
      requestAnimationFrame(() => {
        sketchViewModel.update(e.graphic, {
          tool: 'reshape',
          toggleToolOnClick: false
        })
      })

      // Store temp feature in state and emit create
      const tempFeature = graphicToGeoJSON(e.graphic)
      eventBus.emit('draw:create', tempFeature)
      dispatch({ type: 'SET_FEATURE', payload: { tempFeature }})

      handleCreateComplete.remove()
    }
  })

  sketchViewModel.polygonSymbol = createSymbol(mapState.mapStyle.mapColorScheme)
  sketchViewModel.create('polygon')

  dispatch({ type: 'SET_MODE', payload: 'new-polygon' })
}