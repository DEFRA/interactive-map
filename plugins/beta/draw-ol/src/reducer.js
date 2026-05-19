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

const actions = {
  SET_MODE: (state, payload) => ({ ...state, mode: payload }),

  SET_FEATURE: (state, payload) => ({
    ...state,
    feature: payload.feature === undefined ? state.feature : payload.feature,
    tempFeature: payload.tempFeature === undefined ? state.tempFeature : payload.tempFeature
  }),

  SET_SELECTED_VERTEX_INDEX: (state, payload) => ({
    ...state,
    selectedVertexIndex: payload.index,
    numVertices: payload.numVertices
  }),

  SET_UNDO_STACK_LENGTH: (state, payload) => ({
    ...state,
    undoStackLength: payload
  }),

  TOGGLE_SNAP: (state) => ({ ...state, snap: !state.snap }),

  SET_HAS_SNAP_LAYERS: (state, payload) => ({ ...state, hasSnapLayers: !!payload })
}

export { initialState, actions }
