import { debounce } from '../../../../src/utils/debounce.js'
import { fetchSuggestions } from './fetchSuggestions.js'
import { createFormHandlers } from './formHandlers.js'
import { createInputHandlers } from './inputHandlers.js'
import { createSuggestionHandlers } from './suggestionHandlers.js'

const DEBOUNCE_FETCH_TIME = 350

export function attachEvents(args) {
  const { dispatch, searchContainerRef } = args

  // Debounce data fetching
  const debouncedFetchSuggestions = debounce(
    (value) => fetchSuggestions(value, args.datasets, dispatch, args.transformRequest),
    DEBOUNCE_FETCH_TIME
  )

  // Compose all handler sets
  const formHandlers = createFormHandlers(args)
  const inputHandlers = createInputHandlers({ ...args, debouncedFetchSuggestions })
  const suggestionHandlers = createSuggestionHandlers(args)

  // Return single unified event API
  return {
    ...formHandlers,
    ...inputHandlers,
    ...suggestionHandlers,

    handleOutside(e) {
      if (searchContainerRef.current.contains(e.target)) {
        return
      }
      dispatch({ type: 'TOGGLE_EXPANDED', payload: false })
      args.services.eventBus.emit('search:close')
    }
  }
}
