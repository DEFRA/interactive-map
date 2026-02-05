import { getSnapInstance } from '../utils/snapHelpers.js'

/**
 * Programmatically create a new line
 * @param {object} context - plugin context
 * @param {string} featureId - ID for the new feature
 * @param {object} options - Options including snapLayers.
 */
export const newLine = ({ appState, appConfig, pluginState, mapProvider }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw, map } = mapProvider

  if (!draw) {
    return
  }

  // Set per-call snap layers if provided
  const snap = getSnapInstance(map)
  if (snap?.setSnapLayers) {
    snap.setSnapLayers(options.snapLayers || null)
  } else if (options.snapLayers) {
    // Snap instance not ready yet - store for later
    map._pendingSnapLayers = options.snapLayers
  } else {
    // No action
  }

  // Update state so UI can react to snap layer availability
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: options.snapLayers?.length > 0 })

  // Change mode to draw_line
  draw.changeMode('draw_line', {
    container: appState.layoutRefs.viewportRef.current,
    vertexMarkerId: `${appConfig.id}-cross-hair`,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    getSnapEnabled: () => mapProvider.snapEnabled === true,
    featureId
  })

  // Set mode to draw_line
  dispatch({ type: 'SET_MODE', payload: 'draw_line' })
}
