import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

export const newPolygon = ({ appState, appConfig, pluginConfig, pluginState, mapState, mapProvider, services }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  eventBus.emit('draw:started', { mode: 'draw_polygon' })

  const snapLayers = options.snapLayers !== undefined ? options.snapLayers : (pluginConfig.snapLayers ?? null)
  draw.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  const { stroke, fill, strokeWidth, properties: customProperties, ...modeOptions } = options
  const properties = {
    ...customProperties,
    ...flattenStyleProperties({ stroke, fill, strokeWidth })
  }

  draw.changeMode('draw_polygon', {
    container: appState.layoutRefs.viewportRef.current,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    crossHair: mapState.crossHair,
    getSnapEnabled: () => draw.isSnapEnabled(),
    featureId,
    ...modeOptions,
    properties
  })

  dispatch({ type: 'SET_MODE', payload: 'draw_polygon' })
}
