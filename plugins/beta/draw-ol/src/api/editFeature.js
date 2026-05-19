/**
 * Programmatically start editing a feature.
 *
 * @param {object} context - plugin context
 * @param {string} featureId - ID of the feature to edit
 * @param {object} options - { snapLayers }
 * @returns {boolean} true if edit mode entered, false if feature not found
 */
export const editFeature = (
  { appState, appConfig, pluginConfig, pluginState, mapProvider, services },
  featureId,
  options = {}
) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return false
  }

  const existingFeature = draw.get(featureId)
  if (!existingFeature) {
    return false
  }

  eventBus.emit('draw:editstart', { mode: 'edit_vertex' })

  const snapLayers = options.snapLayers === undefined
    ? (pluginConfig.snapLayers ?? null)
    : options.snapLayers

  draw.snap?.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  draw.changeMode('edit_vertex', {
    container: appState.layoutRefs.viewportRef.current,
    deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
    interfaceType: appState.interfaceType,
    featureId
  })

  dispatch({
    type: 'SET_FEATURE',
    payload: { feature: existingFeature, tempFeature: existingFeature }
  })

  dispatch({ type: 'SET_MODE', payload: 'edit_vertex' })
  return true
}
