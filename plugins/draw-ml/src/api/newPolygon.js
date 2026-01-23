/**
 * Programmatically edit a feature
 * @param {object} context - plugin context
 * @param {object} feature - A single geoJSON feature
 */
export const newPolygon = ({ appState, appConfig, pluginState, mapProvider }, featureId) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider

  if (!draw) {
    return
  }

  // Change mode to draw_vertex
  draw.changeMode('draw_vertex', {
    container: appState.layoutRefs.viewportRef.current,
    vertexMarkerId: `${appConfig.id}-cross-hair`,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    featureId,
    getSnapEnabled: () => mapProvider.snapEnabled === true
  })

  // Set mode to draw_vertex
  dispatch({ type: 'SET_MODE', payload: 'draw_vertex' })
}