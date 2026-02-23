import { DEFAULTS } from '../defaults.js'

export const createInputHandlers = ({ dispatch, debouncedFetchSuggestions }) => ({
  handleInputClick() {
    dispatch({ type: 'SHOW_SUGGESTIONS' })
  },

  handleInputFocus(interfaceType) {
    dispatch({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: interfaceType === 'keyboard' })
  },

  handleInputBlur(interfaceType) {
    dispatch({ type: 'INPUT_BLUR', payload: interfaceType })
  },

  handleInputChange(e) {
    const value = e.target.value
    dispatch({ type: 'SET_VALUE', payload: value })

    if (value.length < DEFAULTS.minSearchLength) {
      debouncedFetchSuggestions.cancel()
      dispatch({ type: 'UPDATE_SUGGESTIONS', payload: [] })
      dispatch({ type: 'HIDE_SUGGESTIONS' })
      return
    }

    dispatch({ type: 'SHOW_SUGGESTIONS' })
    debouncedFetchSuggestions(value)
  }
})
