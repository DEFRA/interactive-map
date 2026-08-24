import { flattenStyleProperties } from '../utils/flattenStyleProperties.js'

// Shared body for newLine/newPolygon — the two are identical except which draw_* mode they
// enter, so that's the only thing parameterised here. Kept out of newPoint.js: a Point also
// needs symbol-key extraction (see newPoint.js), a genuine difference, not just the mode string.
export const createNewShape = (mode) => ({ appState, appConfig, pluginConfig, pluginState, mapState, mapProvider, services }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  eventBus.emit('draw:started', { mode })

  const snapLayers = options.snapLayers === undefined ? (pluginConfig.snapLayers ?? null) : options.snapLayers
  draw.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  const { stroke, fill, strokeWidth, properties: customProperties, onGeometryChange, ...modeOptions } = options
  // Per-call callback overrides the plugin-level one; events.js reads this on every commit.
  draw._geometryValidator = onGeometryChange ?? pluginConfig.onGeometryChange
  const properties = {
    ...customProperties,
    ...flattenStyleProperties({ stroke, fill, strokeWidth })
  }

  draw.changeMode(mode, {
    container: appState.layoutRefs.viewportRef.current,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    crossHair: mapState.crossHair,
    getSnapEnabled: () => draw.isSnapEnabled(),
    featureId,
    ...modeOptions,
    properties
  })

  dispatch({ type: 'SET_MODE', payload: mode })
}
