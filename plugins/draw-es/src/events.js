import * as simplifyOperator from '@arcgis/core/geometry/operators/simplifyOperator.js'
import { createGraphic, createSymbol, graphicToGeoJSON } from './graphic.js'

const MODE_CHANGE_DELAY = 50

export function attachEvents ({ pluginState, mapProvider, events, eventBus, buttonConfig, mapColorScheme }) {
  const { view, sketchViewModel, sketchLayer, emptySketchLayer } = mapProvider

  if (!sketchViewModel) {
    return null
  }

  const { drawDone, drawCancel } = buttonConfig
  const { dispatch, mode, feature } = pluginState

  // Re-colour graphics when map style changes
  const reColour = async () => {
    const activeGraphicId = pluginState.feature?.properties?.id
    let activeGraphic = null
    const isCreating = sketchViewModel.state === 'active' && !activeGraphicId

    // Cancel and wait, but only if we're in update mode (not create mode)
    if (sketchViewModel.state === 'active' && activeGraphicId) {
      sketchViewModel.cancel()
      await new Promise(resolve => setTimeout(resolve, MODE_CHANGE_DELAY))
    }

    // Update the default symbol for new polygons
    sketchViewModel.polygonSymbol = createSymbol(mapColorScheme)

    // Update existing graphics
    sketchLayer?.graphics.items.forEach(graphic => {
      const newGraphic = createGraphic(
        graphic.attributes.id,
        graphic.geometry.rings,
        mapColorScheme
      )
      graphic.symbol = newGraphic.symbol

      if (activeGraphicId === graphic.attributes.id) {
        activeGraphic = graphic
      }
    })

    // Re-enter update mode only if we were editing (not creating)
    if (activeGraphic && !isCreating && sketchViewModel.layer === sketchLayer) {
      try {
        await sketchViewModel.update(activeGraphic, {
          tool: 'reshape',
          toggleToolOnClick: false
        })
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error updating sketch:', error)
        }
      }
    }
  }

  // Re-enter update graphic mode
  const updateGraphic = () => {
    const graphic = sketchLayer.graphics?.items?.[0] ?? null
    if (graphic) {
      setTimeout(() => sketchViewModel.update(graphic), 0)
    }
  }

  // Event handlers
  const handleMapStyleChange = () => reColour()

  const onGraphicChanged = (graphic) => {
    if (!graphic) {
      return
    }
    const tempFeature = graphicToGeoJSON(graphic)
    eventBus.emit('draw:updated', tempFeature)
    dispatch({ type: 'SET_FEATURE', payload: { tempFeature } })
  }

  const handleSketchUpdate = (e) => {
    const toolInfoType = e.toolEventInfo?.type
    const graphic = e.graphics[0]

    // Prevent polygon move
    if (toolInfoType === 'move-start') {
      sketchViewModel.cancel()
      updateGraphic()
    }

    // Prevent self-intersect
    if (toolInfoType === 'reshape') {
      const isSimple = simplifyOperator.isSimple(graphic.geometry)
      if (!isSimple) {
        sketchViewModel.undo()
      }
    }

    // Emit event on update
    if (toolInfoType === 'reshape-stop' || toolInfoType === 'vertex-remove') {
      onGraphicChanged(graphic)
    }
  }

  const handleViewClick = async () => {
    if (!mode) {
      return
    }

    const updateGraphics = sketchViewModel.updateGraphics || []
    if (updateGraphics.length) {
      return
    }

    // Reinstate update
    updateGraphic()
  }

  const handleCreate = async (event) => {
    const { toolEventInfo } = event
    const graphic = event?.graphic
    if (graphic && toolEventInfo?.type === 'vertex-add') {
      const rings = graphic.geometry?.rings
      // rings.length is > 1 occurs when the shape becomes complex (ie self intersects)
      // setTimeout is required to cause the undo to be called after handleCreate completes
      // otherwise the previous change, rather than this one, is undone
      if (rings?.length > 1) {
        setTimeout(() => sketchViewModel.undo(), 0)
      } else if (rings?.[0]?.length > 3) {
        onGraphicChanged(graphic) // emit a graphic update on draw, once the graphic is 2D
      }
    }
  }

  const handleUndo = async (event) => {
    const graphic = event?.graphics?.[0]
    onGraphicChanged(graphic)
  }

  const handleDone = () => {
    sketchViewModel.cancel()
    sketchViewModel.layer = emptySketchLayer
    dispatch({ type: 'SET_MODE', payload: null })
    dispatch({ type: 'SET_FEATURE', payload: { feature: null, tempFeature: null } })
    eventBus.emit('draw:done', { newFeature: pluginState.tempFeature })
  }

  const handleCancel = () => {
    sketchViewModel.cancel()

    // Clear all graphics
    sketchLayer.removeAll()

    // Reinstate initial feature
    if (feature) {
      const graphic = createGraphic(
        feature.id || feature.properties.id,
        feature.geometry.coordinates,
        mapColorScheme
      )
      sketchLayer.add(graphic)
    }

    // Prevent selection
    sketchViewModel.layer = emptySketchLayer

    dispatch({ type: 'SET_MODE', payload: null })
    eventBus.emit('draw:cancelled')
  }

  // Attach all event listeners
  eventBus.on(events.MAP_STYLE_CHANGE, handleMapStyleChange)
  const sketchUpdateHandler = sketchViewModel.on('update', handleSketchUpdate)
  const viewClickHandler = view.on('click', handleViewClick)
  const createHandler = sketchViewModel.on('create', handleCreate)
  const undoHandler = sketchViewModel.on('undo', handleUndo)

  const prevDoneClick = drawDone.onClick
  const prevCancelClick = drawCancel.onClick

  drawDone.onClick = handleDone
  drawCancel.onClick = handleCancel

  // Return cleanup function
  return () => {
    eventBus.off(events.MAP_STYLE_CHANGE, handleMapStyleChange)
    sketchUpdateHandler.remove()
    viewClickHandler.remove()
    createHandler.remove()
    undoHandler.remove()
    drawDone.onClick = prevDoneClick
    drawCancel.onClick = prevCancelClick
  }
}
