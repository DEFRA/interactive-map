// /plugins/search/reducer.test.js

import { initialState, actions } from './reducer'

describe('search state actions', () => {
  it('TOGGLE_EXPANDED sets isExpanded and areSuggestionsVisible, and resets hasFetchedSuggestions', () => {
    const state = { ...initialState, hasFetchedSuggestions: true }
    const newState = actions.TOGGLE_EXPANDED(state, true)
    expect(newState.isExpanded).toBe(true)
    expect(newState.areSuggestionsVisible).toBe(true)
    expect(newState.hasFetchedSuggestions).toBe(false)

    const collapsed = actions.TOGGLE_EXPANDED(state, false)
    expect(collapsed.isExpanded).toBe(false)
    expect(collapsed.areSuggestionsVisible).toBe(false)
    expect(collapsed.hasFetchedSuggestions).toBe(false)
  })

  it('SET_KEYBOARD_FOCUS_WITHIN sets focus and shows suggestions', () => {
    const state = { ...initialState }
    const newState = actions.SET_KEYBOARD_FOCUS_WITHIN(state, true)
    expect(newState.hasKeyboardFocusWithin).toBe(true)
    expect(newState.areSuggestionsVisible).toBe(true)

    const removedFocus = actions.SET_KEYBOARD_FOCUS_WITHIN(state, false)
    expect(removedFocus.hasKeyboardFocusWithin).toBe(false)
    expect(removedFocus.areSuggestionsVisible).toBe(true) // always true
  })

  it('INPUT_BLUR removes focus and updates areSuggestionsVisible correctly', () => {
    const state = { ...initialState, areSuggestionsVisible: true, hasKeyboardFocusWithin: true }

    // Non-keyboard blur
    const newStateMouse = actions.INPUT_BLUR(state, 'mouse')
    expect(newStateMouse.hasKeyboardFocusWithin).toBe(false)
    expect(newStateMouse.areSuggestionsVisible).toBe(true) // still true
    expect(newStateMouse.selectedIndex).toBe(-1)

    // Keyboard blur hides suggestions
    const newStateKeyboard = actions.INPUT_BLUR(state, 'keyboard')
    expect(newStateKeyboard.hasKeyboardFocusWithin).toBe(false)
    expect(newStateKeyboard.areSuggestionsVisible).toBe(false) // now false
    expect(newStateKeyboard.selectedIndex).toBe(-1)
  })

  it('SET_VALUE updates the input value', () => {
    const state = { ...initialState }
    const newState = actions.SET_VALUE(state, 'test')
    expect(newState.value).toBe('test')
  })

  it('UPDATE_SUGGESTIONS updates the suggestions array and sets hasFetchedSuggestions', () => {
    const state = { ...initialState }
    const suggestions = [{ id: 1 }, { id: 2 }]
    const newState = actions.UPDATE_SUGGESTIONS(state, suggestions)
    expect(newState.suggestions).toEqual(suggestions)
    expect(newState.hasFetchedSuggestions).toBe(true)
  })

  it('SHOW_SUGGESTIONS sets areSuggestionsVisible to true and resets hasFetchedSuggestions', () => {
    const state = { ...initialState, areSuggestionsVisible: false, hasFetchedSuggestions: true }
    const newState = actions.SHOW_SUGGESTIONS(state)
    expect(newState.areSuggestionsVisible).toBe(true)
    expect(newState.hasFetchedSuggestions).toBe(false)
  })

  it('HIDE_SUGGESTIONS sets areSuggestionsVisible to false and resets hasFetchedSuggestions', () => {
    const state = { ...initialState, areSuggestionsVisible: true, hasFetchedSuggestions: true }
    const newState = actions.HIDE_SUGGESTIONS(state)
    expect(newState.areSuggestionsVisible).toBe(false)
    expect(newState.hasFetchedSuggestions).toBe(false)
  })

  it('SET_SELECTED updates selectedIndex and visibility', () => {
    const state = { ...initialState, areSuggestionsVisible: false }
    
    const selected = actions.SET_SELECTED(state, 1)
    expect(selected.selectedIndex).toBe(1)
    expect(selected.areSuggestionsVisible).toBe(true)

    const deselected = actions.SET_SELECTED(state, -1)
    expect(deselected.selectedIndex).toBe(-1)
    expect(deselected.areSuggestionsVisible).toBe(false)
  })
})