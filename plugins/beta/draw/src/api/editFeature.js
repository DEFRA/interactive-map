import { MAP_SIZE_SCALES } from '../defaults.js'

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

  const editModeMap = { LineString: 'edit_line', Polygon: 'edit_polygon' }
  eventBus.emit('draw:editstart', { mode: editModeMap[existingFeature.geometry.type] })

  const snapLayers = options.snapLayers !== undefined ? options.snapLayers : (pluginConfig.snapLayers ?? null)
  draw.setSnapLayers(snapLayers)
  dispatch({ type: 'SET_HAS_SNAP_LAYERS', payload: snapLayers?.length > 0 })

  draw.changeMode('edit_vertex', {
    container: appState.layoutRefs.viewportRef.current,
    deleteVertexButtonId: `${appConfig.id}-draw-delete-point`,
    undoButtonId: `${appConfig.id}-draw-undo`,
    isPanEnabled: appState.interfaceType !== 'keyboard',
    interfaceType: appState.interfaceType,
    scale: MAP_SIZE_SCALES[mapState.mapSize],
    featureId,
    getSnapEnabled: () => draw.isSnapEnabled()
  })

  const feature = draw.get(featureId)
  dispatch({
    type: 'SET_FEATURE',
    payload: { feature, tempFeature: feature }
  })

  dispatch({ type: 'SET_MODE', payload: 'edit_vertex' })

  return true
}
