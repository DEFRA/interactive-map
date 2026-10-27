import { isShapeDrawMode } from './utils/drawModes.js'

const initialState = {
  mode: null,
  action: null,
  actionValid: false,
  feature: null,
  tempFeature: null,
  selectedVertexIndex: -1,
  numVertices: null,
  // Copies of the commit-check controller's state (validation/commitChecks.js), so the
  // buttons can read it. Written only by events.js, from setOnSettle and hold(); nothing
  // else should set them.
  // Status of the latest check: 'idle' | 'pending' | 'valid' | 'invalid' | 'error'
  validationStatus: 'idle',
  // Whether a pending check has run long enough to show as "Checking…" (SLOW_CHECK_MS)
  checkSlow: false,
  // A finished shape is waiting on its pending check before it's created
  holding: false,
  // Live validity of the displayed shape while editing (drag/nudge in progress)
  previewValid: true,
  canAddPoint: true,
  snap: false,
  hasSnapLayers: false,
  undoStackLength: 0
}

const setMode = (state, payload) => ({
  ...state,
  mode: payload,
  numVertices: isShapeDrawMode(payload) ? 0 : state.numVertices,
  // A new/empty shape has no passing check yet; its first commit (or edit mode's
  // edit-start check in api/editFeature) settles it.
  validationStatus: 'idle',
  checkSlow: false,
  holding: false,
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

const setValidationStatus = (state, payload) => ({ ...state, validationStatus: payload, checkSlow: false })

const setCheckSlow = (state) => ({ ...state, checkSlow: true })

const setHolding = (state, payload) => ({ ...state, holding: !!payload })

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
  SET_CHECK_SLOW: setCheckSlow,
  SET_HOLDING: setHolding,
  SET_PREVIEW_VALID: setPreviewValid,
  SET_CAN_ADD_POINT: setCanAddPoint
}

export { initialState, actions }
