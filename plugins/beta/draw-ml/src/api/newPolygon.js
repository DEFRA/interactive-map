import { getSnapInstance } from '../utils/snapHelpers.js'
import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

/**
 * Programmatically create a new polygon
 * @param {object} context - plugin context
 * @param {string} featureId - ID for the new feature
 * @param {object} options - Options including snapLayers, stroke, fill, strokeWidth, properties.
 */
export const newPolygon = ({ appState, appConfig, pluginConfig, pluginState, mapProvider, services }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw, map } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  // Emit draw:start
  eventBus.emit('draw:start', { mode: 'draw_polygon' })

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

  // Extract style props and flatten variants into properties
  const { stroke, fill, strokeWidth, properties: customProperties, ...modeOptions } = options
  const properties = {
    ...customProperties,
    ...flattenStyleProperties({ stroke, fill, strokeWidth })
  }

  // Change mode to draw_polygon
  draw.changeMode('draw_polygon', {
    container: appState.layoutRefs.viewportRef.current,
    vertexMarkerId: `${appConfig.id}-cross-hair`,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    getSnapEnabled: () => mapProvider.snapEnabled === true,
    featureId,
    ...modeOptions,
    properties
  })

  // Set mode to draw_polygon
  dispatch({ type: 'SET_MODE', payload: 'draw_polygon' })
}
