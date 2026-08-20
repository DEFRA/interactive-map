import { SYMBOL_KEYS } from '../utils/symbolKeys.js'

export const newPoint = ({ appState, appConfig, pluginConfig, pluginState, mapState, mapProvider, services }, featureId, options = {}) => {
  const { dispatch } = pluginState
  const { draw } = mapProvider
  const { eventBus } = services

  if (!draw) {
    return
  }

  eventBus.emit('draw:started', { mode: 'draw_point' })

  const snapLayers = options.snapLayers === undefined ? (pluginConfig.snapLayers ?? null) : options.snapLayers
  draw.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  const { properties: customProperties, onGeometryChange, ...modeOptions } = options
  // Per-call callback overrides the plugin-level one; events.js reads this on every commit.
  draw._geometryValidator = onGeometryChange ?? pluginConfig.onGeometryChange

  const symbolStyle = {}
  SYMBOL_KEYS.forEach((key) => {
    if (modeOptions[key] !== undefined) {
      symbolStyle[key] = modeOptions[key]
      delete modeOptions[key]
    }
  })

  draw.changeMode('draw_point', {
    container: appState.layoutRefs.viewportRef.current,
    addVertexButtonId: `${appConfig.id}-draw-add-point`,
    interfaceType: appState.interfaceType,
    crossHair: mapState.crossHair,
    getSnapEnabled: () => draw.isSnapEnabled(),
    featureId,
    ...modeOptions,
    properties: { ...customProperties, ...symbolStyle }
  })

  dispatch({ type: 'SET_MODE', payload: 'draw_point' })
}
