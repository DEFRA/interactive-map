import { fetchSuggestions } from './fetchSuggestions.js'
import { updateMap } from '../utils/updateMap.js'
import { DEFAULTS } from '../defaults.js'

export const createFormHandlers = ({
  dispatch,
  services,
  viewportRef,
  mapProvider,
  markers,
  datasets,
  transformRequest,
  showMarker,
  markerColor
}) => {
  let lastFetchedValue = ''

  return {
    handleOpenClick() {
      dispatch({ type: 'TOGGLE_EXPANDED', payload: true })
      services.eventBus.emit('search:open')
    },

    handleCloseClick(_e, buttonRef) {
      dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
      dispatch({ type: 'UPDATE_SUGGESTIONS', payload: [] })
      dispatch({ type: 'SET_VALUE', payload: '' })
      setTimeout(() => buttonRef.current.focus(), 0)
      markers.remove('search')
      services.eventBus.emit('search:clear')
      services.eventBus.emit('search:close')
    },

    async handleSubmit(e, appState, pluginState) {
      e.preventDefault()
      const { suggestions, selectedIndex, value } = pluginState
      const trimmedValue = value?.trim()

      dispatch({ type: 'SET_SELECTED', payload: -1 })
      dispatch({ type: 'HIDE_SUGGESTIONS' })

      if (selectedIndex >= 0) {
        const suggestion = suggestions[selectedIndex]
        dispatch({ type: 'SET_VALUE', payload: suggestion.text })
        viewportRef.current?.focus()
        updateMap({ mapProvider, bounds: suggestion.bounds, point: suggestion.point, markers, showMarker, markerColor })
        services.eventBus.emit('search:match', { query: suggestion.text, ...suggestion })
        return
      }

      if (trimmedValue?.length < DEFAULTS.minSearchLength) {
        return
      }

      let newSuggestions = suggestions
      if (!suggestions.length || trimmedValue !== lastFetchedValue) {
        const { results, sanitisedValue } = await fetchSuggestions(trimmedValue, datasets, dispatch, transformRequest)
        newSuggestions = results
        lastFetchedValue = sanitisedValue
      }

      if (newSuggestions.length) {
        if (appState.interfaceType === 'keyboard') {
          viewportRef.current?.focus()
        }
        if (appState.breakpoint === 'mobile') {
          dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
          services.eventBus.emit('search:close')
        }
        const suggestion = newSuggestions[0]
        updateMap({ mapProvider, bounds: suggestion.bounds, point: suggestion.point, markers, showMarker, markerColor })
        services.eventBus.emit('search:match', { query: value, ...suggestion })
      }
    }
  }
}
