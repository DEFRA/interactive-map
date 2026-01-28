import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'

export const createSketchViewModel = ({ mapProvider }) => {
  const { view } = mapProvider

  const sketchLayer = new GraphicsLayer({ id: 'sketchLayer' })
  view.map.add(sketchLayer)

  const emptySketchLayer = new GraphicsLayer({ id: 'emptySketchLayer' })
  view.map.add(emptySketchLayer)

  const sketchViewModel = new SketchViewModel({
    view,
    layer: emptySketchLayer,
    defaultUpdateOptions: {
      tool: 'reshape',
      updateOnGraphicClick: false,
      multipleSelectionEnabled: false,
      toggleToolOnClick: false,
      highlightOptions: {
        enabled: false
      }
    }
  })

  return {
    sketchViewModel,
    emptySketchLayer,
    sketchLayer
  }
}