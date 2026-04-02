/**
 * @jest-environment jsdom
 */
import { createFormHandlers } from './formHandlers.js'
import { fetchSuggestions } from './fetchSuggestions.js'
import { updateMap } from '../utils/updateMap.js'
import { DEFAULTS } from '../defaults.js'

jest.mock('./fetchSuggestions.js')
jest.mock('../utils/updateMap.js')

describe('createFormHandlers', () => {
  let dispatch
  let services
  let viewportRef
  let markers
  let handlers

  beforeEach(() => {
    dispatch = jest.fn()

    services = {
      eventBus: { emit: jest.fn() }
    }

    viewportRef = {
      current: { focus: jest.fn() }
    }

    markers = {
      remove: jest.fn()
    }

    handlers = createFormHandlers({
      dispatch,
      services,
      viewportRef,
      mapProvider: 'map',
      markers,
      datasets: [],
      transformRequest: jest.fn(),
      showMarker: true,
      markerOptions: { backgroundColor: 'red' }
    })

    jest.clearAllMocks()
  })

  test('handleOpenClick dispatches and emits', () => {
    handlers.handleOpenClick()

    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_EXPANDED',
      payload: true
    })
    expect(services.eventBus.emit).toHaveBeenCalledWith('search:open')
  })

  test('handleCloseClick resets state and focuses button', () => {
    jest.useFakeTimers()
    const buttonRef = { current: { focus: jest.fn() } }

    handlers.handleCloseClick(null, buttonRef)

    expect(dispatch).toHaveBeenCalledWith({ type: 'TOGGLE_EXPANDED', payload: false })
    expect(dispatch).toHaveBeenCalledWith({ type: 'UPDATE_SUGGESTIONS', payload: [] })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALUE', payload: '' })
    expect(markers.remove).toHaveBeenCalledWith('search')

    jest.runAllTimers()
    expect(buttonRef.current.focus).toHaveBeenCalled()

    expect(services.eventBus.emit).toHaveBeenCalledWith('search:clear')
    expect(services.eventBus.emit).toHaveBeenCalledWith('search:close')

    jest.useRealTimers()
  })

  test('handleSubmit uses selected suggestion when selectedIndex >= 0', async () => {
    const suggestion = {
      text: 'Paris',
      bounds: 'b',
      point: 'p'
    }

    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      {},
      {
        suggestions: [suggestion],
        selectedIndex: 0,
        value: 'x'
      }
    )

    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_SELECTED', payload: -1 })
    expect(dispatch).toHaveBeenCalledWith({ type: 'HIDE_SUGGESTIONS' })
    expect(dispatch).toHaveBeenCalledWith({ type: 'SET_VALUE', payload: 'Paris' })

    expect(updateMap).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: 'b', point: 'p' })
    )

    expect(services.eventBus.emit).toHaveBeenCalledWith(
      'search:match',
      expect.objectContaining({ query: 'Paris' })
    )
  })

  test('handleSubmit returns early for short input', async () => {
    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      {},
      {
        suggestions: [],
        selectedIndex: -1,
        value: 'a'.repeat(DEFAULTS.minSearchLength - 1)
      }
    )

    expect(fetchSuggestions).not.toHaveBeenCalled()
    expect(updateMap).not.toHaveBeenCalled()
  })

  test('handleSubmit fetches suggestions and updates map (keyboard)', async () => {
    fetchSuggestions.mockResolvedValueOnce({
      sanitisedValue: 'rome',
      results: [
        { text: 'Rome', bounds: 'b', point: 'p' }
      ]
    })

    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      { interfaceType: 'keyboard' },
      {
        suggestions: [],
        selectedIndex: -1,
        value: 'rome'
      }
    )

    expect(fetchSuggestions).toHaveBeenCalled()
    expect(viewportRef.current.focus).toHaveBeenCalled()
    expect(updateMap).toHaveBeenCalled()
    expect(services.eventBus.emit).toHaveBeenCalledWith(
      'search:match',
      expect.objectContaining({ query: 'rome' })
    )
  })

  test('handleSubmit mobile closes search', async () => {
    fetchSuggestions.mockResolvedValueOnce({
      sanitisedValue: 'berlin',
      results: [
        { text: 'Berlin', bounds: 'b', point: 'p' }
      ]
    })

    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      { breakpoint: 'mobile' },
      {
        suggestions: [],
        selectedIndex: -1,
        value: 'berlin'
      }
    )

    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_EXPANDED',
      payload: false
    })
    expect(services.eventBus.emit).toHaveBeenCalledWith('search:close')
  })

  test('handleSubmit does nothing when no suggestions are returned', async () => {
    fetchSuggestions.mockResolvedValueOnce({
      sanitisedValue: 'none',
      results: []
    })

    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      {},
      {
        suggestions: [],
        selectedIndex: -1,
        value: 'none'
      }
    )

    // Fetch happens
    expect(fetchSuggestions).toHaveBeenCalled()

    // But nothing downstream runs
    expect(updateMap).not.toHaveBeenCalled()
    expect(services.eventBus.emit).not.toHaveBeenCalledWith(
      'search:match',
      expect.anything()
    )
  })

  test('does not refetch when value matches lastFetchedValue', async () => {
    fetchSuggestions.mockResolvedValueOnce({
      sanitisedValue: 'same',
      results: [{ text: 'Same', bounds: 'b', point: 'p' }]
    })

    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      {},
      {
        suggestions: [],
        selectedIndex: -1,
        value: 'same'
      }
    )

    await handlers.handleSubmit(
      { preventDefault: jest.fn() },
      {},
      {
        suggestions: [{ text: 'Same', bounds: 'b', point: 'p' }],
        selectedIndex: -1,
        value: 'same'
      }
    )

    expect(fetchSuggestions).toHaveBeenCalledTimes(1)
  })
})
