import { getCoords, getMidpoints } from '../utils/geometryHelpers.js'
import { ADAPTER_EVENTS } from '../../../adapterEvents.js'

// Deferred commit-level geometrychange emitter (feature + change phase + vertex index)
// consumed by the validation layer. Deferred a tick so that a rejection's revert runs
// after the current mutation's undo bookkeeping has settled.
const createGeometryValidationEmitter = (manager, store, olFeature) => (phase, vertexIndex) => {
  if (!phase) { return }
  setTimeout(() => {
    manager.emit(ADAPTER_EVENTS.GEOMETRY_CHANGE, { feature: store.toGeoJSON(olFeature), phase, vertexIndex })
  }, 0)
}

// Reflect the current selection onto the handle layers and emit VERTEX_SELECTION.
const applySelectionChange = (state, { vertexLayer, midpointLayer, activeLayer, manager, hooks }) => {
  vertexLayer.setSelected(state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1)
  midpointLayer.setSelected(
    state.selectedVertexType === 'midpoint' ? state.selectedVertexIndex - state.vertices.length : -1
  )
  if (state.selectedVertexIndex < 0) {
    hooks.onDeselect?.()
  }
  activeLayer.update(state)
  manager.emit(ADAPTER_EVENTS.VERTEX_SELECTION, {
    index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
    numVertices: state.vertices.length
  })
}

/**
 * Mutable edit-mode state shared by the Modify interaction, pointer, touch and
 * keyboard handlers, plus the setState/sync helpers that keep the handle
 * layers, the active-selection overlay and the adapter events in step with it.
 *
 * Hooks (`onDeselect`, `onUpdate`) are bound late via `setHooks` because the
 * touch handler both consumes this state and needs to react to its changes.
 *
 * @returns {{ state, getState, setState, syncGeom, updateLayersFromGeom, setHooks, destroy }}
 */
export const createSelectionState = ({ map, manager, store, olFeature, interfaceType, layers }) => {
  const { vertexLayer, midpointLayer, activeLayer } = layers

  const state = {
    olFeature,
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertices: [],
    midpoints: [],
    interfaceType: interfaceType ?? 'mouse'
  }

  const hooks = { onDeselect: null, onUpdate: null }
  const setHooks = ({ onDeselect, onUpdate }) => Object.assign(hooks, { onDeselect, onUpdate })

  const plainGeom = () => {
    const geom = olFeature.getGeometry()
    return { type: geom.getType(), coordinates: geom.getCoordinates() }
  }

  const applySelectionChangeLocal = () => applySelectionChange(state, { vertexLayer, midpointLayer, activeLayer, manager, hooks })

  const applyVertexChange = () => {
    const geom = plainGeom()
    midpointLayer.update(geom)
    vertexLayer.update(geom)
    state.midpoints = midpointLayer.getCoords()
    activeLayer.update(state)
    hooks.onUpdate?.()
    map.render()
  }

  const setState = (updates) => {
    Object.assign(state, updates)
    if (updates.selectedVertexIndex !== undefined) {
      applySelectionChangeLocal()
    }
    if (updates.vertices !== undefined) {
      applyVertexChange()
    }
  }

  // Lightweight per-frame update during drag — refreshes layers without emitting events
  const updateLayersFromGeom = () => {
    const geom = plainGeom()
    state.vertices = getCoords(geom)
    state.midpoints = getMidpoints(geom)
    midpointLayer.update(geom)
    vertexLayer.update(geom)
    activeLayer.update(state)
  }

  const syncGeom = () => {
    updateLayersFromGeom()
    manager.emit(ADAPTER_EVENTS.VERTEX_CHANGE, { numVertices: state.vertices.length })
    manager.emit(ADAPTER_EVENTS.UPDATE, store.toGeoJSON(olFeature))
  }

  const emitGeometryValidation = createGeometryValidationEmitter(manager, store, olFeature)

  // Keep overlay layers in sync on every geometry change (e.g. during pointer drag)
  const onGeometryChange = () => updateLayersFromGeom()
  olFeature.getGeometry().on('change', onGeometryChange)

  return {
    state,
    getState: () => state,
    setState,
    syncGeom,
    emitGeometryValidation,
    updateLayersFromGeom,
    setHooks,
    destroy () {
      olFeature.getGeometry().un('change', onGeometryChange)
    }
  }
}
