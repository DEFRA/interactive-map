import { startCheckSession, getCommitChecks } from '../validation/commitChecks.js'

export const editFeature = ({ appState, appConfig, mapState, pluginConfig, pluginState, mapProvider, services }, featureId, options = {}) => {
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

  startCheckSession(draw, options, pluginConfig, eventBus)

  // A Point has no ring of vertices to edit — edit_point relocates the single coordinate
  // instead of edit_vertex's ring-of-vertices machinery.
  const editModeMap = { LineString: 'edit_line', Polygon: 'edit_polygon', Point: 'edit_point' }
  const mode = existingFeature.geometry.type === 'Point' ? 'edit_point' : 'edit_vertex'
  eventBus.emit('draw:editstart', { mode: editModeMap[existingFeature.geometry.type], featureId })

  const snapLayers = options.snapLayers === undefined ? (pluginConfig.snapLayers ?? null) : options.snapLayers
  draw.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  draw.changeMode(mode, {
    container: appState.layoutRefs.viewportRef.current,
    deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
    undoButtonId: `${appConfig.id}-draw-undo`,
    isPanEnabled: appState.interfaceType !== 'keyboard',
    interfaceType: appState.interfaceType,
    scale: mapState.mapSizeScale,
    featureId,
    getSnapEnabled: () => draw.isSnapEnabled()
  })

  const feature = draw.get(featureId)
  dispatch({
    type: 'SET_FEATURE',
    payload: { feature, tempFeature: feature }
  })

  dispatch({ type: 'SET_MODE', payload: mode })

  // Seed the Done-button gate and the stroke from the feature's starting check, so an
  // already invalid feature opens dashed and cannot be "finished" until fixed. events.js
  // applies the result once it settles (straight away unless onGeometryChange is async).
  getCommitChecks(draw).run({ feature, context: { phase: 'edit-start', mode }, onGeometryChange: draw._commitValidator })

  return true
}
