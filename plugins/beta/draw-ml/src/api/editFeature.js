import { getSnapInstance } from '../utils/snapHelpers.js'

/**
 * Programmatically edit a feature
 * @param {object} context - plugin context
 * @param {string} featureId - ID of the feature to edit
 * @param {object} options - Options including snapLayers
 */
export const editFeature = ({ appState, appConfig, mapState, pluginConfig, pluginState, mapProvider }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw, map } = mapProvider

  if (!draw) {
    return
  }

  // Determin snapLayers from pluginConfig or runtime config
  let snapLayers = null
  if (options.snapLayers !== undefined) {
    snapLayers = options.snapLayers
  } else if (pluginConfig.snapLayers !== undefined) {
    snapLayers = pluginConfig.snapLayers
  } else {
    snapLayers = null
  }

  // Set per-call snap layers if provided
  const snap = getSnapInstance(map)
  if (snap?.setSnapLayers) {
    snap.setSnapLayers(snapLayers)
  } else if (snapLayers) {
    // Snap instance not ready yet - store for later
    map._pendingSnapLayers = snapLayers
  } else {
    // No action
  }

  // Update state so UI can react to snap layer availability
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  // Change mode to edit_vertex
  draw.changeMode('edit_vertex', {
    container: appState.layoutRefs.viewportRef.current,
    deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
    undoButtonId: `${appConfig.id}-draw-undo`,
    isPanEnabled: appState.interfaceType !== 'keyboard',
    interfaceType: appState.interfaceType,
    scale: { small: 1, medium: 1.5, large: 2 }[mapState.mapSize],
    featureId,
    getSnapEnabled: () => mapProvider.snapEnabled === true
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