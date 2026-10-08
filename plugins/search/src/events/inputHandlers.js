import { DEFAULTS } from '../defaults.js'

export const createInputHandlers = ({ dispatch, debouncedFetchSuggestions }) => ({
  handleInputClick () {
    dispatch({ type: 'SHOW_SUGGESTIONS' })
  },

  handleInputFocus (interfaceType) {
    dispatch({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: interfaceType === 'keyboard' })
  },

  handleInputBlur (interfaceType) {
    dispatch({ type: 'INPUT_BLUR', payload: interfaceType })
  },

  handleInputChange (e, pluginState) {
    const value = e.target.value
    dispatch({ type: 'SET_VALUE', payload: value })

    // Typing after arrowing to a suggestion returns the focus ring to the input
    if (pluginState?.selectedIndex >= 0) {
      dispatch({ type: 'SET_SELECTED', payload: -1 })
      dispatch({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: true })
    }

    if (value.length < DEFAULTS.minSearchLength) {
      debouncedFetchSuggestions.cancel()
      dispatch({ type: 'UPDATE_SUGGESTIONS', payload: { results: [], hasError: false } })
      dispatch({ type: 'HIDE_SUGGESTIONS' })
      return
    }

    dispatch({ type: 'SHOW_SUGGESTIONS' })
    debouncedFetchSuggestions(value)
  }
})
