// src/plugins/search/Form.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { Form } from './Form'

// Mock Suggestions to simulate user interactions
jest.mock('../Suggestions/Suggestions', () => ({
  Suggestions: ({ handleSuggestionClick, id }) => (
    <button
      data-testid='suggestion'
      onClick={() => handleSuggestionClick('clicked-suggestion')}
      id={`${id}-search-suggestions`}
    >
      Suggestion
    </button>
  )
}))

describe('Form', () => {
  const baseProps = {
    id: 'test',
    inputRef: { current: null },
    pluginState: {
      isExpanded: false,
      value: '',
      suggestionsVisible: false,
      areSuggestionsVisible: false,
      hasFetchedSuggestions: false,
      suggestions: [],
      selectedIndex: -1,
      hasKeyboardFocusWithin: false
    },
    pluginConfig: {
      expanded: false,
      width: '400px'
    },
    appState: {
      breakpoint: 'desktop',
      interfaceType: 'keyboard'
    },
    events: {
      handleSubmit: jest.fn(),
      handleInputClick: jest.fn(),
      handleInputChange: jest.fn(),
      handleInputFocus: jest.fn(),
      handleInputBlur: jest.fn(),
      handleInputKeyDown: jest.fn(),
      handleSuggestionClick: jest.fn()
    },
    services: {
      announce: jest.fn()
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without error when suggestions is undefined (uses default empty array)', () => {
    const { suggestions: _omit, ...pluginStateWithoutSuggestions } = baseProps.pluginState
    render(<Form {...baseProps} pluginState={pluginStateWithoutSuggestions} />)
    expect(screen.getByRole('search')).toBeInTheDocument()
  })

  it('renders the form element with correct role, ID, and base classes', () => {
    render(<Form {...baseProps} />)
    const form = screen.getByRole('search')
    expect(form).toHaveAttribute('id', 'test-search-form')
    expect(form.className).toContain('im-c-search-form')
    expect(form.className).toContain('im-c-panel')
  })

  it('applies expanded styles and width when the pluginConfig is expanded', () => {
    render(
      <Form
        {...baseProps}
        pluginConfig={{ ...baseProps.pluginConfig, expanded: true }}
      />
    )
    const form = screen.getByRole('search')
    expect(form).toHaveStyle({ display: 'flex', width: '400px' })
    expect(form.className).toContain('im-c-search-form--default-expanded')
  })

  it('calls handleSubmit with the event, appState, and pluginState when form is submitted', () => {
    render(<Form {...baseProps} />)
    const form = screen.getByRole('search')
    fireEvent.submit(form)
    expect(baseProps.events.handleSubmit).toHaveBeenCalledTimes(1)
    expect(baseProps.events.handleSubmit.mock.calls[0][1]).toBe(baseProps.appState)
    expect(baseProps.events.handleSubmit.mock.calls[0][2]).toBe(baseProps.pluginState)
  })

  it('renders the search input with correct ARIA attributes when suggestions are visible and an item is selected', () => {
    render(
      <Form
        {...baseProps}
        pluginState={{
          ...baseProps.pluginState,
          suggestionsVisible: true,
          selectedIndex: 2
        }}
      />
    )
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(input).toHaveAttribute('aria-activedescendant', 'test-search-suggestion-2')
    expect(input).toHaveAttribute('aria-controls', 'test-search-suggestions')
  })

  it('adds keyboard focus class when the input container has focus within', () => {
    render(
      <Form
        {...baseProps}
        pluginState={{ ...baseProps.pluginState, hasKeyboardFocusWithin: true }}
      />
    )
    const container = screen.getByRole('search').querySelector('.im-c-search__input-container')
    expect(container.className).toContain('im-c-search__input-container--keyboard-focus-within')
  })

  it('does not set aria-describedby when the search input has a value', () => {
    render(
      <Form
        {...baseProps}
        pluginState={{ ...baseProps.pluginState, value: 'something' }}
      />
    )
    const input = screen.getByRole('combobox')
    expect(input).not.toHaveAttribute('aria-describedby')
  })

  it('wires input event handlers correctly (click, change, focus, blur, keydown)', () => {
    render(<Form {...baseProps} />)
    const input = screen.getByRole('combobox')
    fireEvent.click(input)
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.focus(input)
    fireEvent.blur(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(baseProps.events.handleInputClick).toHaveBeenCalled()
    expect(baseProps.events.handleInputChange).toHaveBeenCalled()
    expect(baseProps.events.handleInputFocus).toHaveBeenCalledWith('keyboard')
    expect(baseProps.events.handleInputBlur).toHaveBeenCalledWith('keyboard')
    expect(baseProps.events.handleInputKeyDown).toHaveBeenCalled()
  })

  it('renders children passed into the input container (e.g., CloseButton)', () => {
    render(
      <Form {...baseProps}>
        <div data-testid='close-button' />
      </Form>
    )
    expect(screen.getByTestId('close-button')).toBeInTheDocument()
  })

  it('renders the Suggestions component', () => {
    render(<Form {...baseProps} />)
    expect(screen.getByTestId('suggestion')).toBeInTheDocument()
  })

  it('calls events.handleSuggestionClick when a suggestion is clicked', () => {
    render(<Form {...baseProps} />)
    fireEvent.click(screen.getByTestId('suggestion'))
    expect(baseProps.events.handleSuggestionClick).toHaveBeenCalledWith(
      'clicked-suggestion',
      baseProps.appState
    )
  })

  describe('status element and announce', () => {
    // Helper: pluginState representing a completed fetch (hasFetchedSuggestions: true)
    const searchedState = { areSuggestionsVisible: true, hasFetchedSuggestions: true }

    it('hides the status element when suggestions are not visible', () => {
      const { container } = render(<Form {...baseProps} />)
      expect(container.querySelector('.im-c-search__status')).toBeNull()
    })

    it('shows the status element when a search returned no results', () => {
      render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, ...searchedState, suggestions: [] }}
        />
      )
      expect(screen.getByText('No results available')).toBeInTheDocument()
    })

    it('hides the status element when there are results', () => {
      const { container } = render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, ...searchedState, suggestions: [{ text: 'London' }] }}
        />
      )
      expect(container.querySelector('.im-c-search__status')).toBeNull()
    })

    it('hides the status element when the fetch has not yet completed', () => {
      const { container } = render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, areSuggestionsVisible: true, hasFetchedSuggestions: false, suggestions: [] }}
        />
      )
      expect(container.querySelector('.im-c-search__status')).toBeNull()
    })

    it('announces "No results available" when a search returned no results', () => {
      render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, ...searchedState, suggestions: [] }}
        />
      )
      expect(baseProps.services.announce).toHaveBeenCalledWith('No results available')
    })

    it('announces result count when suggestions are visible and populated', () => {
      render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, ...searchedState, suggestions: [{ text: 'A' }, { text: 'B' }] }}
        />
      )
      expect(baseProps.services.announce).toHaveBeenCalledWith('2 results available')
    })

    it('uses singular "result" for a single result', () => {
      render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, ...searchedState, suggestions: [{ text: 'A' }] }}
        />
      )
      expect(baseProps.services.announce).toHaveBeenCalledWith('1 result available')
    })

    it('does not announce when suggestions are not visible', () => {
      render(<Form {...baseProps} />)
      expect(baseProps.services.announce).not.toHaveBeenCalled()
    })

    it('does not announce when the fetch has not yet completed', () => {
      render(
        <Form
          {...baseProps}
          pluginState={{ ...baseProps.pluginState, areSuggestionsVisible: true, hasFetchedSuggestions: false, suggestions: [] }}
        />
      )
      expect(baseProps.services.announce).not.toHaveBeenCalled()
    })
  })
})
