/**
 * Programmatically start editing a feature.
 *
 * @param {object} context - plugin context
 * @param {string} featureId - ID of the feature to edit
 * @param {object} options - { snapLayers }
 * @returns {boolean} true if edit mode entered, false if feature not found
 */
export const editFeature = (
  { appState, appConfig, mapState, pluginConfig, pluginState, mapProvider, services },
  featureId,
  options = {}
) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) return false

  // Feature must exist before entering edit mode
  const existingFeature = draw.get(featureId)
  if (!existingFeature) return false

  const mode = existingFeature.geometry.type === 'LineString' ? 'edit_line' : 'edit_polygon'
  eventBus.emit('draw:editstart', { mode: 'edit_vertex' })

  // Snap layers (for later when snap is implemented)
  const snapLayers = options.snapLayers ?? pluginConfig.snapLayers ?? null

  draw.changeMode('edit_vertex', {
    container: appState.layoutRefs.viewportRef.current,
    deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
    interfaceType: appState.interfaceType,
    featureId
  })

  // Store the feature for cancel/restore
  dispatch({
    type: 'SET_FEATURE',
    payload: { feature: existingFeature, tempFeature: existingFeature }
  })

  dispatch({ type: 'SET_MODE', payload: 'edit_vertex' })
  return true
}
