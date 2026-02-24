// src/plugins/search/Suggestions.test.jsx

import { render, screen, fireEvent } from '@testing-library/react'
import { Suggestions } from './Suggestions'

describe('Suggestions', () => {
  const baseProps = {
    id: 'test',
    pluginState: {
      areSuggestionsVisible: true,
      suggestions: [
        { id: '1', marked: 'First' },
        { id: '2', marked: 'Second' },
      ],
      selectedIndex: 0,
    },
    handleSuggestionClick: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the listbox with correct attributes', () => {
    render(<Suggestions {...baseProps} />)
    const listbox = screen.getByRole('listbox')
    expect(listbox).toHaveAttribute('id', 'test-search-suggestions')
    expect(listbox).toHaveAttribute('aria-labelledby', 'test-search')
    expect(listbox.className).toContain('im-c-search-suggestions')
  })

  it('hides the listbox when suggestions are not visible', () => {
    render(
      <Suggestions
        {...baseProps}
        pluginState={{ ...baseProps.pluginState, areSuggestionsVisible: false }}
      />
    )
    const listbox = screen.getByRole('listbox', { hidden: true })
    expect(listbox).toHaveStyle({ display: 'none' })
  })

  it('hides the listbox when suggestions array is empty', () => {
    render(
      <Suggestions
        {...baseProps}
        pluginState={{ ...baseProps.pluginState, suggestions: [] }}
      />
    )
    const listbox = screen.getByRole('listbox', { hidden: true })
    expect(listbox).toHaveStyle({ display: 'none' })
  })

  it('renders all suggestion items with correct ARIA attributes', () => {
    render(<Suggestions {...baseProps} />)
    const items = screen.getAllByRole('option')
    expect(items).toHaveLength(2)

    items.forEach((item, i) => {
      expect(item).toHaveAttribute('id', `test-search-suggestion-${i}`)
      expect(item).toHaveClass('im-c-search-suggestions__item')
      expect(item).toHaveAttribute('aria-setsize', '2')
      expect(item).toHaveAttribute('aria-posinset', `${i + 1}`)
    })

    // First item should be selected
    expect(items[0]).toHaveAttribute('aria-selected', 'true')
    expect(items[1]).toHaveAttribute('aria-selected', 'false')
  })

  it('calls handleSuggestionClick when a suggestion is clicked', () => {
    render(<Suggestions {...baseProps} />)
    const items = screen.getAllByRole('option')
    fireEvent.click(items[1])
    expect(baseProps.handleSuggestionClick).toHaveBeenCalledWith(
      baseProps.pluginState.suggestions[1]
    )
  })
})