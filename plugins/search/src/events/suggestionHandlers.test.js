/**
 * @jest-environment jsdom
 */
import { createSuggestionHandlers } from './suggestionHandlers.js'
import { updateMap } from '../utils/updateMap.js'

jest.mock('../utils/updateMap.js')

describe('createSuggestionHandlers', () => {
  let dispatch
  let services
  let handlers

  beforeEach(() => {
    dispatch = jest.fn()

    services = {
      eventBus: { emit: jest.fn() },
      announce: jest.fn()
    }

    handlers = createSuggestionHandlers({
      dispatch,
      services,
      mapProvider: 'map',
      markers: 'markers',
      showMarker: true,
      markerColor: 'blue'
    })

    jest.clearAllMocks()
  })

  // ---------- Suggestion click ----------

  test('handleSuggestionClick (desktop)', () => {
    const suggestion = { text: 'Paris', bounds: 'b', point: 'p' }

    handlers.handleSuggestionClick(suggestion, { breakpoint: 'desktop' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALUE', payload: 'Paris' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'HIDE_SUGGESTIONS' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED', payload: -1 })
    expect(updateMap).toHaveBeenCalledWith(expect.objectContaining({ bounds: 'b', point: 'p' }))
    expect(services.eventBus.emit).toHaveBeenCalledWith(
      'search:match',
      expect.objectContaining({ query: 'Paris' })
    )
  })

  test('handleSuggestionClick (mobile closes search)', () => {
    const suggestion = { text: 'Berlin', bounds: 'b', point: 'p' }

    handlers.handleSuggestionClick(suggestion, { breakpoint: 'mobile' })

    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_EXPANDED', payload: false })
    expect(services.eventBus.emit).toHaveBeenCalledWith('search:close')
  })

  // ---------- ArrowDown ----------

  test('ArrowDown selects next suggestion', () => {
    const e = { key: 'ArrowDown', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, {
      suggestions: [{ text: 'A' }, { text: 'B' }],
      selectedIndex: 0
    })

    expect(e.preventDefault).toHaveBeenCalled()
    expect(services.announce).toHaveBeenCalledWith('B. 2 of 2 is highlighted')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED', payload: 1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: false })
  })

  test('ArrowDown does nothing when no suggestions', () => {
    const e = { key: 'ArrowDown', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, { suggestions: [], selectedIndex: 0 })

    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(services.announce).not.toHaveBeenCalled()
  })

  test('ArrowDown does nothing when at last suggestion', () => {
    const e = { key: 'ArrowDown', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, {
      suggestions: [{ text: 'A' }, { text: 'B' }],
      selectedIndex: 1 // last index
    })

    expect(e.preventDefault).toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(services.announce).not.toHaveBeenCalled()
  })

  // ---------- ArrowUp ----------

  test('ArrowUp moves selection up and resets to -1', () => {
    const e = { key: 'ArrowUp', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, {
      suggestions: [{ text: 'A' }, { text: 'B' }],
      selectedIndex: 0
    })

    expect(e.preventDefault).toHaveBeenCalled()
    expect(services.announce).toHaveBeenCalledWith('2 suggestions available')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED', payload: -1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: true })
  })

  test('ArrowUp moves selection up normally when selectedIndex > 0', () => {
    const e = { key: 'ArrowUp', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, {
      suggestions: [{ text: 'A' }, { text: 'B' }, { text: 'C' }],
      selectedIndex: 2
    })

    expect(e.preventDefault).toHaveBeenCalled()
    expect(services.announce).toHaveBeenCalledWith('B. 2 of 3 is highlighted')
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED', payload: 1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_KEYBOARD_FOCUS_WITHIN', payload: false })
  })

  test('ArrowUp does nothing when no suggestions', () => {
    const e = { key: 'ArrowUp', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, { suggestions: [], selectedIndex: 0 })

    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(services.announce).not.toHaveBeenCalled()
  })

  // ---------- Escape & default ----------

  test('Escape hides suggestions and clears selection', () => {
    const e = { key: 'Escape', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, {
      suggestions: [{ text: 'A' }],
      selectedIndex: 0
    })

    expect(e.preventDefault).toHaveBeenCalled()
    expect(dispatch).toHaveBeenCalledWith({ type: 'HIDE_SUGGESTIONS' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED', payload: -1 })
  })

  test('Other keys do nothing', () => {
    const e = { key: 'Enter', preventDefault: jest.fn() }

    handlers.handleInputKeyDown(e, {
      suggestions: [{ text: 'A' }],
      selectedIndex: 0
    })

    expect(e.preventDefault).not.toHaveBeenCalled()
    expect(dispatch).not.toHaveBeenCalled()
    expect(services.announce).not.toHaveBeenCalled()
  })
})