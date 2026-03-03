// src/plugins/search/Form.jsx
import { useEffect } from 'react'
import { Suggestions } from '../Suggestions/Suggestions'

const getResultMessage = (count) => {
  if (count === 0) {
    return 'No results available'
  }
  const plural = count === 1 ? 'result' : 'results'
  return `${count} ${plural} available`
}

const getFormStyle = (pluginConfig, pluginState, appState) => ({
  display: pluginConfig.expanded || pluginState.isExpanded ? 'flex' : undefined,
  ...(appState.breakpoint !== 'mobile' && pluginConfig?.width && { width: pluginConfig.width }),
})

export const Form = ({
  id,
  pluginState,
  pluginConfig,
  appState,
  inputRef,
  events,
  services,
  children, // For SearchClose
}) => {
  const { areSuggestionsVisible, hasFetchedSuggestions, suggestions = [] } = pluginState

  // Announce when a fetch has completed (hasFetchedSuggestions flips to true),
  // not when the input is merely focused/clicked (SHOW_SUGGESTIONS resets it to false).
  useEffect(() => {
    if (!areSuggestionsVisible || !hasFetchedSuggestions) {
      return
    }
    services.announce(getResultMessage(suggestions.length))
  }, [suggestions, hasFetchedSuggestions])

  const classNames = [
    'im-c-search-form',
    pluginConfig.expanded && 'im-c-search-form--default-expanded',
    'im-c-panel'
  ].filter(Boolean).join(' ')

  const showNoResults = areSuggestionsVisible && hasFetchedSuggestions && !suggestions.length

  return (
    <form
      id={`${id}-search-form`}
      role="search"
      className={classNames}
      style={getFormStyle(pluginConfig, pluginState, appState)}
      aria-controls={`${id}-viewport`}
      onSubmit={(e) => events.handleSubmit(e, appState, pluginState)}
    >
      {/* Hidden submit button - required for Enter key to trigger form submission */}
      <button type="submit" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1}>
        Submit
      </button>

      <div className={`im-c-search__input-container${pluginState.hasKeyboardFocusWithin ? ' im-c-search__input-container--keyboard-focus-within' : ''}`}>
        <label htmlFor={`${id}-search`} className="im-u-visually-hidden">Search</label>
        <input
          id={`${id}-search`}
          className="im-c-search__input"
          type="search"
          role="combobox"
          aria-expanded={pluginState.suggestionsVisible}
          aria-controls={`${id}-search-suggestions`}
          aria-activedescendant={pluginState.selectedIndex >= 0 ? `${id}-search-suggestion-${pluginState.selectedIndex}` : undefined}
          aria-describedby={pluginState.value ? undefined : `${id}-search-hint`}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Search"
          name={`${id}-search`}
          spellCheck={false}
          enterKeyHint="search"
          value={pluginState.value}
          onClick={events.handleInputClick}
          onChange={events.handleInputChange}
          onFocus={() => events.handleInputFocus(appState.interfaceType)}
          onBlur={() => events.handleInputBlur(appState.interfaceType)}
          onKeyDown={(e) => events.handleInputKeyDown(e, pluginState)}
          ref={inputRef}
        />
        <span id={`${id}-search-hint`} className="im-c-search__hint">
          When search results are available use up and down arrows to review and enter to select. Touch device users, explore by touch or with swipe gestures.
        </span>
        {/* Close button passed as child */}
        {children}
      </div>
      {showNoResults && (
        <div className="im-c-search__status" aria-hidden="true">
          No results available
        </div>
      )}
      <Suggestions
        id={id}
        appState={appState}
        pluginState={pluginState}
        handleSuggestionClick={(suggestion) => events.handleSuggestionClick(suggestion, appState)}
      />
    </form>
  )
}
