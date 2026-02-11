import { updateMap } from '../utils/updateMap.js'

export const createSuggestionHandlers = ({ dispatch, services, mapProvider, markers, showMarker, markerColor }) => {
  const selectionMessage = (suggestions, index) =>
    index >= 0
      ? `${suggestions[index]?.text}. ${index + 1} of ${suggestions.length} is highlighted`
      : `${suggestions.length} suggestions available`

  return {
    handleSuggestionClick(suggestion, appState) {
      dispatch({ type: 'SET_VALUE', payload: suggestion.text })
      dispatch({ type: 'HIDE_SUGGESTIONS' })
      dispatch({ type: 'SET_SELECTED', payload: -1 })

      if (appState.breakpoint === 'mobile') {
        dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
        services.eventBus.emit('search:close')
      }

      updateMap({ mapProvider, bounds: suggestion.bounds, point: suggestion.point, markers, showMarker, markerColor })
      services.eventBus.emit('search:match', { query: suggestion.text, ...suggestion })
    },

    handleInputKeyDown(e, pluginState) {
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
          dispatch({ type: 'HIDE_SUGGESTIONS' })
          dispatch({ type: 'SET_SELECTED', payload: -1 })
          break
        }

        default: {
          // This code runs for any other key press
          break
        }
      }
    },
  }
}
