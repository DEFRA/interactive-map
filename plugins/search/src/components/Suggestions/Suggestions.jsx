// src/plugins/search/Suggestions.jsx
export const Suggestions = ({ id, pluginState, handleSuggestionClick }) => {
  return (
    <ul // nosonar
      id={`${id}-search-suggestions`}
      role="listbox" // nosonar
      aria-labelledby={`${id}-search`} // Option A: label from input
      className="im-c-search-suggestions"
      style={!pluginState.areSuggestionsVisible || !pluginState.suggestions.length ? { display: 'none' } : undefined }
    >
      {pluginState.suggestions.map((suggestion, i) => (
        <li // nosonar
          key={suggestion.id}
          id={`${id}-search-suggestion-${i}`}
          className="im-c-search-suggestions__item"
          role="option" // nosonar
          aria-selected={pluginState.selectedIndex === i}
          aria-setsize={pluginState.suggestions.length}
          aria-posinset={i + 1}
          onClick={() => handleSuggestionClick(suggestion)} // nosonar
        >
          <span className="im-c-search-suggestions__label" dangerouslySetInnerHTML={{ __html: suggestion.marked }} />
        </li>
      ))}
    </ul>
  )
}
