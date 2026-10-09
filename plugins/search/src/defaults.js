export const DEFAULTS = {
  expanded: false,
  showMarker: true,
  placeholder: 'Search',
  minSearchLength: 3,
  maxSuggestions: 8,
  noResultsMessage: 'No results available',
  searchErrorMessage: 'Sorry, there was a problem with search'
}

// Read by screen readers as focus moves to the map after a search finds a result
export const RESULT_MESSAGE = 'Map moved to {query}'

// The application mode search enters while its form is expanded (see search.scss's .im-o-app--mode-search)
export const APPLICATION_MODE_ID = 'search'
