const initialState = {
  mode: null,
  feature: null,
  tempFeature: null,
  selectedVertexIndex: -1,
  numVertices: null,
  undoStackLength: 0,
  snap: false,
  hasSnapLayers: false
}

const setMode = (state, payload) => ({ ...state, mode: payload, numVertices: null })

const setFeature = (state, payload) => ({
  ...state,
  feature: payload.feature === undefined ? state.feature : payload.feature,
  tempFeature: payload.tempFeature === undefined ? state.tempFeature : payload.tempFeature
})

const setSelectedVertexIndex = (state, payload) => ({
  ...state,
  selectedVertexIndex: payload.index,
  numVertices: payload.numVertices
})

const setUndoStackLength = (state, payload) => ({ ...state, undoStackLength: payload })

const toggleSnap = (state) => ({ ...state, snap: !state.snap })

const setHasSnapLayers = (state, payload) => ({ ...state, hasSnapLayers: !!payload })

const actions = {
  SET_MODE: setMode,
  SET_FEATURE: setFeature,
  SET_SELECTED_VERTEX_INDEX: setSelectedVertexIndex,
  SET_UNDO_STACK_LENGTH: setUndoStackLength,
  TOGGLE_SNAP: toggleSnap,
  SET_HAS_SNAP_LAYERS: setHasSnapLayers
}

export { initialState, actions }
