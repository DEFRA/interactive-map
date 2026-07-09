import { MAP_SIZE_SCALES } from '../defaults.js'
import { validateGeometry } from '../validation/validateGeometry.js'

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

  // Per-call callback overrides the plugin-level one; events.js reads this on every commit.
  draw._geometryValidator = options.onGeometryChange ?? pluginConfig.onGeometryChange

  const editModeMap = { LineString: 'edit_line', Polygon: 'edit_polygon' }
  eventBus.emit('draw:editstart', { mode: editModeMap[existingFeature.geometry.type] })

  const snapLayers = options.snapLayers === undefined ? (pluginConfig.snapLayers ?? null) : options.snapLayers
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

  // Seed the Done-button gate and the stroke from the feature's starting validity
  // so an already invalid feature opens dashed and cannot be "finished" until fixed.
  const { valid } = validateGeometry(feature, { phase: 'edit-start', mode: 'edit_vertex' }, { onGeometryChange: draw._geometryValidator })
  dispatch({ type: 'SET_GEOMETRY_VALID', payload: valid })
  draw.setInvalid?.(!valid)

  return true
}
