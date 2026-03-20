/**
 * @jest-environment jsdom
 */
import { attachEvents } from './index.js'
import { fetchSuggestions } from './fetchSuggestions.js'
import { createFormHandlers } from './formHandlers.js'
import { createInputHandlers } from './inputHandlers.js'
import { createSuggestionHandlers } from './suggestionHandlers.js'
import { debounce } from '../../../../src/utils/debounce.js'

jest.mock('./fetchSuggestions.js')
jest.mock('./formHandlers.js')
jest.mock('./inputHandlers.js')
jest.mock('./suggestionHandlers.js')
jest.mock('../../../../src/utils/debounce.js')

describe('attachEvents', () => {
  let dispatch
  let services
  let searchContainerRef
  let args

  beforeEach(() => {
    dispatch = jest.fn()

    services = {
      eventBus: { emit: jest.fn() }
    }

    searchContainerRef = {
      current: {
        contains: jest.fn()
      }
    }

    // Mock debounce to return the function immediately
    debounce.mockImplementation(fn => fn)

    createFormHandlers.mockReturnValue({ formHandler: jest.fn() })
    createInputHandlers.mockReturnValue({ inputHandler: jest.fn() })
    createSuggestionHandlers.mockReturnValue({ suggestionHandler: jest.fn() })

    args = {
      dispatch,
      services,
      searchContainerRef,
      datasets: [],
      transformRequest: jest.fn()
    }

    jest.clearAllMocks()
  })

  test('composes handlers from all handler factories', () => {
    const handlers = attachEvents(args)

    expect(createFormHandlers).toHaveBeenCalledWith(args)
    expect(createSuggestionHandlers).toHaveBeenCalledWith(args)

    expect(createInputHandlers).toHaveBeenCalledWith(
      expect.objectContaining({
        debouncedFetchSuggestions: expect.any(Function)
      })
    )

    expect(handlers.formHandler).toBeDefined()
    expect(handlers.inputHandler).toBeDefined()
    expect(handlers.suggestionHandler).toBeDefined()
  })

  test('debouncedFetchSuggestions calls fetchSuggestions with correct args', () => {
    attachEvents(args)

    // grab the debounced function passed to input handlers
    const { debouncedFetchSuggestions } =
      createInputHandlers.mock.calls[0][0]

    debouncedFetchSuggestions('query')

    expect(fetchSuggestions).toHaveBeenCalledWith(
      'query',
      args.datasets,
      dispatch,
      args.transformRequest
    )

    expect(debounce).toHaveBeenCalledWith(
      expect.any(Function),
      350
    )
  })

  test('handleOutside does nothing when click is inside container', () => {
    searchContainerRef.current.contains.mockReturnValue(true)

    const handlers = attachEvents(args)

    handlers.handleOutside({ target: 'inside' })

    expect(dispatch).not.toHaveBeenCalled()
    expect(services.eventBus.emit).not.toHaveBeenCalled()
  })

  test('handleOutside collapses search when click is outside container', () => {
    searchContainerRef.current.contains.mockReturnValue(false)

    const handlers = attachEvents(args)

    handlers.handleOutside({ target: 'outside' })

    expect(dispatch).toHaveBeenCalledWith({
      type: 'TOGGLE_EXPANDED',
      payload: false
    })

    expect(services.eventBus.emit).toHaveBeenCalledWith('search:close')
  })
})
