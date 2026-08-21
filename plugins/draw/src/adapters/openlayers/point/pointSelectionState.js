import { ADAPTER_EVENTS } from '../../../adapterEvents.js'

// Deferred commit-level geometrychange emitter (feature + change phase + vertex index)
// consumed by the validation layer — copied from edit/selectionState.js's own (identical
// shape, no ring dependency to strip).
const createGeometryValidationEmitter = (manager, store, olFeature) => (phase, vertexIndex) => {
  if (!phase) { return }
  setTimeout(() => {
    manager.emit(ADAPTER_EVENTS.GEOMETRY_CHANGE, { feature: store.toGeoJSON(olFeature), phase, vertexIndex })
  }, 0)
}

/**
 * Mutable edit_point state, matching edit/selectionState.js's public surface
 * ({state, getState, setState, syncGeom, emitGeometryValidation, setHooks, destroy}) closely
 * enough that edit/modifyInteraction.js, edit/touchHandler.js and edit/keyboardHandler.js all
 * run over it unmodified (beyond the moveCoord injection) — but a point has one coordinate,
 * always selected, and no ring/midpoint list to navigate, so this is a standalone
 * implementation rather than a wrapper around the ring-shaped one. No handle layer to keep in
 * step either — the point's own symbol icon is the only visual, styled by the draw layer.
 *
 * @param {{ manager, store, olFeature, interfaceType }} options
 * @returns {{ state, getState, setState, syncGeom, emitGeometryValidation, setHooks, destroy }}
 */
export const createPointSelectionState = ({ manager, store, olFeature, interfaceType }) => {
  const state = {
    olFeature,
    selectedVertexIndex: 0,
    selectedVertexType: 'vertex',
    vertices: [],
    midpoints: [],
    interfaceType: interfaceType ?? 'mouse'
  }

  const hooks = { onUpdate: null }
  const setHooks = ({ onUpdate }) => { hooks.onUpdate = onUpdate }

  const refreshCoord = () => {
    state.vertices = [olFeature.getGeometry().getCoordinates()]
  }

  // The point is always selected — a selectedVertexIndex/Type write (e.g. Escape or
  // Alt+Arrow in the reused edit/keyboardHandler.js, which try to deselect/navigate) is
  // silently dropped rather than stranding the point with no selection. Every other update
  // (interfaceType, vertices) still applies normally.
  const setState = (updates) => {
    const { selectedVertexIndex, selectedVertexType, ...rest } = updates
    Object.assign(state, rest)
    if (updates.vertices !== undefined) {
      hooks.onUpdate?.()
    }
  }

  // Never emits VERTEX_CHANGE — that event unconditionally releases
  // mapProvider.activeMoveTarget (events.js's onVertexChange). The D-pad claim is made once
  // below (VERTEX_SELECTION) and held for the whole edit session.
  const syncGeom = () => {
    refreshCoord()
    manager.emit(ADAPTER_EVENTS.UPDATE, store.toGeoJSON(olFeature))
  }

  const emitGeometryValidation = createGeometryValidationEmitter(manager, store, olFeature)

  // Keeps the cached coordinate in sync on every geometry change (e.g. during a Modify drag)
  const onGeometryChange = () => refreshCoord()
  olFeature.getGeometry().on('change', onGeometryChange)

  refreshCoord()
  manager.emit(ADAPTER_EVENTS.VERTEX_SELECTION, { index: 0, numVertices: 1 })

  return {
    state,
    getState: () => state,
    setState,
    syncGeom,
    emitGeometryValidation,
    setHooks,
    destroy () {
      olFeature.getGeometry().un('change', onGeometryChange)
    }
  }
}
