/**
 * Programmatically start drawing a new polygon.
 *
 * @param {object} context - plugin context
 * @param {string} featureId - unique ID for this feature
 * @param {object} options - { snapLayers, stroke, fill, strokeWidth, properties }
 */
export const newPolygon = (
  { appState, appConfig, pluginConfig, pluginState, mapProvider, services },
  featureId,
  options = {}
) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) return

  eventBus.emit('draw:started', { mode: 'draw_polygon' })

  // Snap layers (for later when snap is implemented)
  const snapLayers = options.snapLayers ?? pluginConfig.snapLayers ?? null

  // Extract style properties and merge with custom properties
  const { stroke, fill, strokeWidth, properties: customProperties, ...modeOptions } = options
  const properties = {
    ...customProperties,
    ...(stroke && { stroke }),
    ...(fill && { fill }),
    ...(strokeWidth && { strokeWidth })
  }

  draw.changeMode('draw_polygon', {
    container: appState.layoutRefs.viewportRef.current,
    interfaceType: appState.interfaceType,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    featureId,
    geometryType: 'Polygon',
    properties,
    mapProvider,
    ...modeOptions
  })

  dispatch({ type: 'SET_MODE', payload: 'draw_polygon' })
}
