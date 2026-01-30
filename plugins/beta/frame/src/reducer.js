const initialState = {
  frame: null,
  frameRefs: null
}

const setFrame = (state, payload) => {
  return {
    ...state,
    frame: payload
  }
}

const setFrameRefs = (state, payload) => {
  return {
    ...state,
    frameRefs: payload
  }
}

const actions = {
  SET_FRAME: setFrame,
  SET_FRAME_REFS: setFrameRefs
}

export {
  initialState,
  actions
}