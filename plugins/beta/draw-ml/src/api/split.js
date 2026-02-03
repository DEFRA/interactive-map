import { getSnapInstance } from '../snapHelpers.js'

/**
 * Programmatically split a polygon or line
 * @param {object} context - plugin context
 * @param {string} feature - the new feature to be split
 * @param {object} options - Options including snapLayers.
 */
export const split = ({ appState, appConfig, pluginState, mapProvider }, feature, options = {}) => {
  const { dispatch } = pluginState
  const { draw, map } = mapProvider

  if (!draw) {
    return
  }

  // Always include 'stroke-inactive' in snap layers
  const snapLayers = ['stroke-inactive.cold', ...(options.snapLayers || [])]

  // Set per-call snap layers if provided
  const snap = getSnapInstance(map)

  if (snap?.setSnapLayers) {
    snap.setSnapLayers(snapLayers)
  } else if (options.snapLayers) {
    // Snap instance not ready yet - store for later
    map._pendingSnapLayers = snapLayers
  } else {
    // No action
  }

  // Update state so UI can react to snap layer availability
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: true })

  // Change mode to draw_line
  draw.changeMode('draw_line', {
    container: appState.layoutRefs.viewportRef.current,
    vertexMarkerId: `${appConfig.id}-cross-hair`,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    getSnapEnabled: () => mapProvider.snapEnabled === true,
    featureId: '_split'
  })

  // Perform split
  map.on('draw.create', () => {
    console.log('Check that split line is valid')
    dispatch({ type: 'SET_ACTION', payload: { name: 'split', isValid: false }})
  })

  // Set mode to 'draw_line'
  dispatch({ type: 'SET_MODE', payload: 'draw_line' })

  // Set action to 'split'
  dispatch({ type: 'SET_ACTION', payload: { name: 'split' }})
}
