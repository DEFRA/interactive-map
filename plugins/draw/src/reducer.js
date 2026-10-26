const initialState = {
  mode: null,
  action: null,
  actionValid: false,
  feature: null,
  tempFeature: null,
  selectedVertexIndex: -1,
  numVertices: null,
  // Commit-level check status: 'idle' | 'pending' | 'valid' | 'invalid' | 'error'.
  // Only 'valid' enables Done.
  validationStatus: 'idle',
  // Live validity of the displayed shape while editing (drag/nudge in progress)
  previewValid: true,
  canAddPoint: true,
  snap: false,
  hasSnapLayers: false,
  undoStackLength: 0
}

const DRAW_MODES = new Set(['draw_polygon', 'draw_line'])

const setMode = (state, payload) => ({
  ...state,
  mode: payload,
  numVertices: DRAW_MODES.has(payload) ? 0 : state.numVertices,
  // A new/empty shape has no passing check yet; its first commit (or edit mode's
  // edit-start check in api/editFeature) settles it.
  validationStatus: 'idle',
  previewValid: true,
  // A fresh mode can always place; the live placement gate flips this on veto.
  canAddPoint: true
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

const setHasSnapLayers = (state, payload) => ({ ...state, hasSnapLayers: !!payload })

const setUndoStackLength = (state, payload) => ({ ...state, undoStackLength: payload })

const setValidationStatus = (state, payload) => ({ ...state, validationStatus: payload })

const setPreviewValid = (state, payload) => ({ ...state, previewValid: !!payload })

const setCanAddPoint = (state, payload) => ({ ...state, canAddPoint: !!payload })

const actions = {
  SET_MODE: setMode,
  SET_ACTION: setAction,
  SET_FEATURE: setFeature,
  SET_SELECTED_VERTEX_INDEX: setSelectedVertexIndex,
  TOGGLE_SNAP: toggleSnap,
  SET_HAS_SNAP_LAYERS: setHasSnapLayers,
  SET_UNDO_STACK_LENGTH: setUndoStackLength,
  SET_VALIDATION_STATUS: setValidationStatus,
  SET_PREVIEW_VALID: setPreviewValid,
  SET_CAN_ADD_POINT: setCanAddPoint
}

export { initialState, actions }
