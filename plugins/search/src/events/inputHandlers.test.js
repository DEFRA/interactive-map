/**
 * @jest-environment jsdom
 */
import { createInputHandlers } from './inputHandlers.js'
import { DEFAULTS } from '../defaults.js'

describe('createInputHandlers', () => {
  let dispatch
  let debouncedFetchSuggestions
  let handlers

  beforeEach(() => {
    dispatch = jest.fn()

    debouncedFetchSuggestions = jest.fn()
    debouncedFetchSuggestions.cancel = jest.fn()

    handlers = createInputHandlers({
      dispatch,
      debouncedFetchSuggestions
    })
  })

  test('handleInputClick shows suggestions', () => {
    handlers.handleInputClick()

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_SUGGESTIONS'
    })
  })

  test('handleInputFocus sets keyboard focus when interface is keyboard', () => {
    handlers.handleInputFocus('keyboard')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_KEYBOARD_FOCUS_WITHIN',
      payload: true
    })
  })

  test('handleInputFocus clears keyboard focus when interface is not keyboard', () => {
    handlers.handleInputFocus('mouse')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_KEYBOARD_FOCUS_WITHIN',
      payload: false
    })
  })

  test('handleInputBlur dispatches blur event', () => {
    handlers.handleInputBlur('keyboard')

    expect(dispatch).toHaveBeenCalledWith({
      type: 'INPUT_BLUR',
      payload: 'keyboard'
    })
  })

  test('handleInputChange below min length cancels debounce and hides suggestions', () => {
    const value = 'a'.repeat(DEFAULTS.minSearchLength - 1)

    handlers.handleInputChange({
      target: { value }
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_VALUE',
      payload: value
    })

    expect(debouncedFetchSuggestions.cancel).toHaveBeenCalled()

    expect(dispatch).toHaveBeenCalledWith({
      type: 'UPDATE_SUGGESTIONS',
      payload: []
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'HIDE_SUGGESTIONS'
    })

    expect(debouncedFetchSuggestions).not.toHaveBeenCalled()
  })

  test('handleInputChange at or above min length shows suggestions and fetches', () => {
    const value = 'a'.repeat(DEFAULTS.minSearchLength)

    handlers.handleInputChange({
      target: { value }
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_VALUE',
      payload: value
    })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'SHOW_SUGGESTIONS'
    })

    expect(debouncedFetchSuggestions).toHaveBeenCalledWith(value)
    expect(debouncedFetchSuggestions.cancel).not.toHaveBeenCalled()
  })
})
