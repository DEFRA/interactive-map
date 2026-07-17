import { fetchSuggestions } from './fetchSuggestions.js'
import { updateMap } from '../utils/updateMap.js'
import { DEFAULTS } from '../defaults.js'

// Resolve the open trigger — a core-rendered MapButton. Prefer the shared buttonRefs
// map (keyed by the manifest button id), falling back to a DOM query on the button's
// class so focus restoration works even if the ref is transiently null / not yet set.
const getTriggerButton = (buttonRefs) =>
  buttonRefs?.current?.search || document.querySelector('.im-c-map-button--search')

// Restore focus to the open trigger once the closing DOM has settled. The trigger only
// becomes focusable again a frame or two after the form closes (its hidden/exclusive
// state clears across re-renders), so keep trying until focus actually lands.
const MAX_FOCUS_FRAMES = 30

const restoreTriggerFocus = (buttonRefs) => {
  let frames = 0
  const focusWhenReady = () => {
    const button = getTriggerButton(buttonRefs)
    if (button) {
      button.focus()
      if (document.activeElement === button) {
        return
      }
    }
    if (frames < MAX_FOCUS_FRAMES) {
      frames += 1
      requestAnimationFrame(focusWhenReady)
    }
  }
  requestAnimationFrame(focusWhenReady)
}

export const createFormHandlers = ({
  dispatch,
  services,
  viewportRef,
  mapProvider,
  markers,
  datasets,
  transformRequest,
  showMarker,
  markerOptions
}) => {
  let lastFetchedValue = ''

  return {
    handleCloseClick (_e, appState) {
      dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
      dispatch({ type: 'UPDATE_SUGGESTIONS', payload: { results: [], hasError: false } })
      dispatch({ type: 'SET_VALUE', payload: '' })
      restoreTriggerFocus(appState?.buttonRefs)
      markers.remove('search')
      services.eventBus.emit('search:clear')
      services.eventBus.emit('search:close')
    },

    async handleSubmit (e, appState, pluginState) {
      e.preventDefault()
      const { suggestions, selectedIndex, value } = pluginState
      const trimmedValue = value?.trim()

      dispatch({ type: 'SET_SELECTED', payload: -1 })
      dispatch({ type: 'HIDE_SUGGESTIONS' })

      if (selectedIndex >= 0) {
        const suggestion = suggestions[selectedIndex]
        dispatch({ type: 'SET_VALUE', payload: suggestion.text })
        viewportRef.current?.focus()
        updateMap({ mapProvider, bounds: suggestion.bounds, point: suggestion.point, markers, showMarker, markerOptions })
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
        viewportRef.current?.focus()
        if (appState.breakpoint === 'mobile') {
          dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
          services.eventBus.emit('search:close')
        }
        const suggestion = newSuggestions[0]
        updateMap({ mapProvider, bounds: suggestion.bounds, point: suggestion.point, markers, showMarker, markerOptions })
        services.eventBus.emit('search:match', { query: value, ...suggestion })
      }
    }
  }
}
