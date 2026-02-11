// src/plugins/search/Form.jsx
import { Suggestions } from '../Suggestions/Suggestions'

export const Form = ({
  id,
  pluginState,
  pluginConfig,
  appState,
  inputRef,
  events,
  children, // For SearchClose
}) => {

  const classNames = [
    'im-c-search-form',
    pluginConfig.isExpanded && 'im-c-search-form--default-expanded',
    'im-c-panel'
  ].filter(Boolean).join(' ')

  return (
    <form
      id={`${id}-search-form`}
      role="search"
      className={classNames}
      style={{
        display: pluginConfig.isExpanded || pluginState.isExpanded ? 'flex' : undefined,
        ...(appState.breakpoint !== 'mobile' && pluginConfig?.width && { width: pluginConfig.width }),
      }}
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

      <Suggestions
        id={id}
        appState={appState}
        pluginState={pluginState}
        handleSuggestionClick={(suggestion) => events.handleSuggestionClick(suggestion, appState)}
      />
    </form>
  )
}