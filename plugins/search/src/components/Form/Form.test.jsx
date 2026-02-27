// src/plugins/search/Form.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { Form } from './Form'

// Mock Suggestions to simulate user interactions
jest.mock('../Suggestions/Suggestions', () => ({
  Suggestions: ({ handleSuggestionClick, id }) => (
    <button
      data-testid="suggestion"
      onClick={() => handleSuggestionClick('clicked-suggestion')}
      id={`${id}-search-suggestions`}
    >
      Suggestion
    </button>
  ),
}))

describe('Form', () => {
  const baseProps = {
    id: 'test',
    inputRef: { current: null },
    pluginState: {
      isExpanded: false,
      value: '',
      suggestionsVisible: false,
      selectedIndex: -1,
      hasKeyboardFocusWithin: false,
    },
    pluginConfig: {
      expanded: false,
      width: '400px',
    },
    appState: {
      breakpoint: 'desktop',
      interfaceType: 'keyboard',
    },
    events: {
      handleSubmit: jest.fn(),
      handleInputClick: jest.fn(),
      handleInputChange: jest.fn(),
      handleInputFocus: jest.fn(),
      handleInputBlur: jest.fn(),
      handleInputKeyDown: jest.fn(),
      handleSuggestionClick: jest.fn(),
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
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
          selectedIndex: 2,
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
        <div data-testid="close-button" />
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
})