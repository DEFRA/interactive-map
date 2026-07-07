const initialState = {
  mode: null,
  action: null,
  actionValid: false,
  feature: null,
  tempFeature: null,
  selectedVertexIndex: -1,
  numVertices: null,
  geometryValid: true,
  snap: false,
  hasSnapLayers: false,
  undoStackLength: 0
}

const DRAW_MODES = new Set(['draw_polygon', 'draw_line'])

const setMode = (state, payload) => ({
  ...state,
  mode: payload,
  numVertices: DRAW_MODES.has(payload) ? 0 : state.numVertices,
  // A new/empty shape is never valid; validation flips this true once the geometry
  // passes all soft rules (edit mode seeds it explicitly in api/editFeature).
  geometryValid: false
})

const setAction = (state, payload) => ({
  ...state,
  action: payload.name,
  actionValid: payload.isValid
})

const setSelectedVertexIndex = (state, payload) => ({
  ...state,
  selectedVertexIndex: payload.index,
  numVertices: payload.numVertices
})

const setFeature = (state, payload) => ({
  ...state,
  feature: payload.feature === undefined ? state.feature : payload.feature,
  tempFeature: payload.tempFeature === undefined ? state.tempFeature : payload.tempFeature
})

const toggleSnap = (state) => ({ ...state, snap: !state.snap })

const setSnap = (state, payload) => ({ ...state, snap: !!payload })

const setHasSnapLayers = (state, payload) => ({ ...state, hasSnapLayers: !!payload })

const setUndoStackLength = (state, payload) => ({ ...state, undoStackLength: payload })

const setGeometryValid = (state, payload) => ({ ...state, geometryValid: !!payload })

const actions = {
  SET_MODE: setMode,
  SET_ACTION: setAction,
  SET_FEATURE: setFeature,
  SET_SELECTED_VERTEX_INDEX: setSelectedVertexIndex,
  TOGGLE_SNAP: toggleSnap,
  SET_SNAP: setSnap,
  SET_HAS_SNAP_LAYERS: setHasSnapLayers,
  SET_UNDO_STACK_LENGTH: setUndoStackLength,
  SET_GEOMETRY_VALID: setGeometryValid
}

export { initialState, actions }
