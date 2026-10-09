import { showResult } from '../utils/showResult.js'

export const createSuggestionHandlers = ({ dispatch, services, mapProvider, markers, showMarker, markerOptions }) => {
  const selectionMessage = (suggestions, index) =>
    index >= 0
      ? `${suggestions[index]?.text}. ${index + 1} of ${suggestions.length} is highlighted`
      : `${suggestions.length} suggestions available`

  return {
    handleSuggestionClick (suggestion, appState) {
      dispatch({ type: 'SET_VALUE', payload: suggestion.text })
      dispatch({ type: 'HIDE_SUGGESTIONS' })
      dispatch({ type: 'SET_SELECTED', payload: -1 })

      if (appState.breakpoint === 'mobile') {
        dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
        services.eventBus.emit('search:close')
      }

      showResult({ suggestion, query: suggestion.text, services, mapProvider, markers, showMarker, markerOptions })
    },

    handleInputKeyDown (e, pluginState) {
      const { suggestions, selectedIndex } = pluginState

      switch (e.key) {
        case 'ArrowDown': {
          if (!suggestions?.length) {
            return
          }
          e.preventDefault()
          if (selectedIndex < suggestions.length - 1) {
            const newIndex = selectedIndex + 1
            services.announce(selectionMessage(suggestions, newIndex))
            dispatch({ type: 'SET_SELECTED', payload: newIndex })
            dispatch({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: false })
          }
          break
        }

        case 'ArrowUp': {
          if (!suggestions?.length) {
            return
          }
          e.preventDefault()
          const newIndex = selectedIndex > 0 ? selectedIndex - 1 : -1
          services.announce(selectionMessage(suggestions, newIndex))
          dispatch({ type: 'SET_SELECTED', payload: newIndex })
          dispatch({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: newIndex < 0 })
          break
        }

        case 'Escape': {
          e.preventDefault()
          // Restore the focus ring to the input container first — SET_KEYBOARD_FOCUS_WITHIN
          // also flips areSuggestionsVisible on, so HIDE_SUGGESTIONS must run after to win
          dispatch({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: true })
          dispatch({ type: 'HIDE_SUGGESTIONS' })
          dispatch({ type: 'SET_SELECTED', payload: -1 })
          break
        }

        default: {
          // This code runs for any other key press
          break
        }
      }
    }
  }
}
