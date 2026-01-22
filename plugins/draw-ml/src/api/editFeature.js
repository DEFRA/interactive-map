/**
 * Programmatically edit a feature
 * @param {object} context - plugin context
 * @param {object} feature - A single geoJSON feature
 */
export const editFeature = ({ appState, appConfig, mapState, pluginState, mapProvider }, featureId) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider

  if (!draw) {
    return
  }

  // --- Change mode to edit_vertex
  draw.changeMode('edit_vertex', {
    container: appState.layoutRefs.viewportRef.current,
    deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
    isPanEnabled: appState.interfaceType !== 'keyboard',
    interfaceType: appState.interfaceType,
    scale: { small: 1, medium: 1.5, large: 2 }[mapState.mapSize],
    featureId,
    getSnapEnabled: () => pluginState.snap !== false
  })

  // Put feature in state
  const feature = draw.get(featureId)
  dispatch({ type: 'SET_FEATURE', payload: {
    feature,
    tempFeature: feature
  }})

  // Set mode to edit_vertex
  dispatch({ type: 'SET_MODE', payload: 'edit_vertex' })
}