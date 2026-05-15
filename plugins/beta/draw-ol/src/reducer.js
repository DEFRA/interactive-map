const initialState = {
  mode: null,
  feature: null,
  tempFeature: null,
  selectedVertexIndex: -1,
  numVertecies: null,
  undoStackLength: 0
}

const actions = {
  SET_MODE: (state, payload) => ({
    ...state,
    mode: payload,
    numVertecies: ['draw_polygon', 'draw_line'].includes(payload) ? 0 : state.numVertecies
  }),

  SET_FEATURE: (state, payload) => ({
    ...state,
    feature: payload.feature === undefined ? state.feature : payload.feature,
    tempFeature: payload.tempFeature === undefined ? state.tempFeature : payload.tempFeature
  }),

  SET_SELECTED_VERTEX_INDEX: (state, payload) => ({
    ...state,
    selectedVertexIndex: payload.index,
    numVertecies: payload.numVertecies !== undefined ? payload.numVertecies : state.numVertecies
  }),

  SET_VERTEX_COUNT: (state, payload) => ({
    ...state,
    numVertecies: payload
  }),

  SET_UNDO_STACK_LENGTH: (state, payload) => ({
    ...state,
    undoStackLength: payload
  })
}

export { initialState, actions }
