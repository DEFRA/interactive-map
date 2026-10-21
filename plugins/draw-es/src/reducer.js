const initialState = {
  mode: null,
  feature: null,
  featureId: null,
  tempFeature: null
}

const setFeatureId = (state, featureId) => {
  return { ...state, featureId }
}
const setMode = (state, payload) => {
  const featureId = payload ? state.featureId : null
  return {
    ...state,
    featureId,
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
  SET_FEATURE: setFeature,
  SET_FEATURE_ID: setFeatureId
}

export {
  initialState,
  actions
}
