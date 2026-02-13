const initialState = {
  mode: null,
  action: null, // 'split | merge'
  actionValid: false, // eg. a valid split line for a target feature
  feature: null,
  tempFeature: null,
  selectedVertexIndex: -1,
  numVertecies: null,
  snap: false,
  hasSnapLayers: false,
  undoStackLength: 0,
  editAfterCreate: true
}

const setMode = (state, payload) => {
  return {
    ...state,
    mode: payload
  }
}

const setAction = (state, payload) => {
  return {
    ...state,
    action: payload.name,
    actionValid: payload.isValid
  }
}

const setSelectedVertexIndex = (state, payload) => {
  return {
    ...state,
    selectedVertexIndex: payload.index,
    numVertecies: payload.numVertecies
  }
}

const setFeature = (state, payload) => {
  return {
    ...state,
    feature: payload.feature === undefined ? state.feature : payload.feature,
    tempFeature: payload.tempFeature === undefined ? state.tempFeature : payload.tempFeature
  }
}

const toggleSnap = (state) => {
  return {
    ...state,
    snap: !state.snap
  }
}

const setSnap = (state, payload) => {
  return {
    ...state,
    snap: !!payload
  }
}

const setHasSnapLayers = (state, payload) => {
  return {
    ...state,
    hasSnapLayers: !!payload
  }
}

const setUndoStackLength = (state, payload) => {
  return {
    ...state,
    undoStackLength: payload
  }
}

const setEditAfterCreate = (state, payload) => {
  return {
    ...state,
    editAfterCreate: !!payload
  }
}

const actions = {
  SET_MODE: setMode,
  SET_ACTION: setAction,
  SET_FEATURE: setFeature,
  SET_SELECTED_VERTEX_INDEX: setSelectedVertexIndex,
  TOGGLE_SNAP: toggleSnap,
  SET_SNAP: setSnap,
  SET_HAS_SNAP_LAYERS: setHasSnapLayers,
  SET_UNDO_STACK_LENGTH: setUndoStackLength,
  SET_EDIT_AFTER_CREATE: setEditAfterCreate
}

export {
  initialState,
  actions
}