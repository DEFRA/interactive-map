const setErrorMessage = (state, payload) => {
  return {
    ...state,
    errorMessage: payload
  }
}

const initialState = {
  errorMessage: null
}

const actions = {
  SET_ERROR_MESSAGE: setErrorMessage
}

export {
  initialState,
  actions
}
