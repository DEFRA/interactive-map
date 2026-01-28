const initialState = {
  mode: null,
  feature: null,
  tempFeature: null
}

const setMode = (state, payload) => {
  return {
    ...state,
    mode: payload
  }
}

const setFeature = (state, payload) => {
  return {
    ...state,
    feature: payload.feature === undefined ? state.feature : payload.feature,
    tempFeature: payload.tempFeature === undefined ? state.tempFeature : payload.tempFeature
  }
}

const actions = {
  SET_MODE: setMode,
  SET_FEATURE: setFeature
}

export {
  initialState,
  actions
}