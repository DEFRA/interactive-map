import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

/**
 * Programmatically start drawing a new polygon.
 *
 * @param {object} context - plugin context
 * @param {string} featureId - unique ID for this feature
 * @param {object} options - { snapLayers, stroke, fill, strokeWidth, properties }
 */
export const newPolygon = (
  { appState, appConfig, mapState, pluginState, mapProvider, services },
  featureId,
  options = {}
) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  eventBus.emit('draw:started', { mode: 'draw_polygon' })

  const { stroke, fill, strokeWidth, properties: customProperties, ...modeOptions } = options
  const properties = {
    ...customProperties,
    ...flattenStyleProperties({ stroke, fill, strokeWidth })
  }

  draw.changeMode('draw_polygon', {
    container: appState.layoutRefs.viewportRef.current,
    interfaceType: appState.interfaceType,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    featureId,
    geometryType: 'Polygon',
    properties,
    mapProvider,
    crossHair: mapState.crossHair,
    ...modeOptions
  })

  dispatch({ type: 'SET_MODE', payload: 'draw_polygon' })
}
