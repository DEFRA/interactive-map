// Tracks the single boundary feature this control manages, plus whether a
// draw/edit session is currently in progress (used to disable all four
// buttons while the map is mid-draw or mid-edit).
const initialState = {
  feature: null,
  busy: false
}

// A feature transition (drawn, added, deleted) always ends any in-progress
// session, so busy is cleared alongside it.
const setFeature = (state, payload) => {
  return {
    ...state,
    feature: payload,
    busy: false
  }
}

const setBusy = (state, payload) => {
  return {
    ...state,
    busy: payload
  }
}

const actions = {
  SET_FEATURE: setFeature,
  SET_BUSY: setBusy
}

export {
  initialState,
  actions
}
