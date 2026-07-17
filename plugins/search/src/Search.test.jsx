// /plugins/search/Search.test.jsx
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Search } from './Search'
import { attachEvents } from './events/index.js'
import { createDatasets } from './datasets.js'

// Mock sub-components
jest.mock('./components/CloseButton/CloseButton', () => ({
  CloseButton: ({ defaultExpanded, onClick }) => (
    <button data-testid='close-button' onClick={onClick}>
      CloseButton-{defaultExpanded ? 'defaultExpanded' : 'collapsed'}
    </button>
  )
}))

jest.mock('./components/SubmitButton/SubmitButton', () => ({
  SubmitButton: ({ defaultExpanded, submitIcon, onClick }) => (
    <button data-testid='submit-button' type='submit' onClick={onClick}>
      SubmitButton-{defaultExpanded ? 'defaultExpanded' : 'collapsed'}
    </button>
  )
}))

jest.mock('./components/Form/Form', () => ({
  Form: ({ children }) => <div data-testid='form'>{children}</div>
}))

// Mock external logic
jest.mock('./datasets.js', () => ({
  createDatasets: jest.fn(() => ['dataset1', 'dataset2'])
}))

jest.mock('./events/index.js', () => ({
  attachEvents: jest.fn(() => ({
    handleCloseClick: jest.fn(),
    handleOutside: jest.fn()
  }))
}))

describe('Search component', () => {
  let props
  let viewportRef

  beforeEach(() => {
    // Clear mock history before every test to prevent call count accumulation
    jest.clearAllMocks()

    viewportRef = { current: { style: { pointerEvents: 'auto' } } }

    props = {
      appConfig: { id: 'search' },
      iconRegistry: { close: '<svg>close</svg>', search: '<svg>search</svg>' },
      pluginState: {
        dispatch: jest.fn(),
        isExpanded: false,
        areSuggestionsVisible: false,
        suggestions: []
      },
      pluginConfig: {
        expanded: false, // This is destructured as defaultExpanded in the component
        customDatasets: [],
        osNamesURL: 'url'
      },
      appState: {
        dispatch: jest.fn(),
        interfaceType: 'keyboard',
        layoutRefs: { viewportRef }
      },
      mapState: { markers: {} },
      services: {},
      mapProvider: { crs: 'EPSG:3857' }
    }
  })

  afterEach(() => {
    cleanup()
  })

  // The open trigger is no longer part of this control — it is a standard MapButton
  // declared in the manifest (see manifest.test.js). The control renders the form only.
  it('renders the form and close button when collapsed', () => {
    render(<Search {...props} />)
    expect(screen.getByTestId('form')).toBeInTheDocument()
    expect(screen.getByTestId('close-button')).toBeInTheDocument()
  })

  it('renders the form regardless of default-expanded mode', () => {
    props.pluginConfig.expanded = true
    render(<Search {...props} />)
    expect(screen.getByTestId('form')).toBeInTheDocument()
    expect(screen.getByTestId('close-button')).toBeInTheDocument()
  })

  it('marks the wrapper collapsed so it takes no layout space when the form is hidden', () => {
    const { container } = render(<Search {...props} />)
    expect(container.querySelector('.im-c-search')).toHaveClass('im-c-search--collapsed')
  })

  it('does not collapse the wrapper when expanded', () => {
    props.pluginState.isExpanded = true
    const { container } = render(<Search {...props} />)
    expect(container.querySelector('.im-c-search')).not.toHaveClass('im-c-search--collapsed')
  })

  it('does not collapse the wrapper in default-expanded mode', () => {
    props.pluginConfig.expanded = true
    const { container } = render(<Search {...props} />)
    expect(container.querySelector('.im-c-search')).not.toHaveClass('im-c-search--collapsed')
  })

  it('calls attachEvents once and persists it across re-renders (useRef coverage)', () => {
    const { rerender } = render(<Search {...props} />)

    expect(createDatasets).toHaveBeenCalledWith({
      customDatasets: [],
      osNamesURL: 'url',
      crs: 'EPSG:3857'
    })

    // Trigger a re-render with a prop change
    rerender(<Search {...props} appState={{ ...props.appState, interfaceType: 'touch' }} />)

    // attachEvents should still only have been called once due to the useRef check
    expect(attachEvents).toHaveBeenCalledTimes(1)
  })

  it('renders SubmitButton when expanded is false', () => {
    render(<Search {...props} />)
    expect(screen.getByTestId('submit-button')).toBeInTheDocument()
  })

  it('CloseButton click triggers handleCloseClick', () => {
    render(<Search {...props} />)
    const events = attachEvents.mock.results[0].value
    fireEvent.click(screen.getByTestId('close-button'))
    expect(events.handleCloseClick).toHaveBeenCalledTimes(1)
  })

  describe('searchOpen logic (Line 46 coverage)', () => {
    it('is true when isExpanded is true', () => {
      props.pluginState.isExpanded = true
      render(<Search {...props} />)
      // If searchOpen is true, pointerEvents becomes 'none'
      expect(viewportRef.current.style.pointerEvents).toBe('none')
    })

    it('is true when defaultExpanded is true and suggestions exist', () => {
      props.pluginConfig.expanded = true // defaultExpanded
      props.pluginState.isExpanded = false
      props.pluginState.areSuggestionsVisible = true
      props.pluginState.suggestions = ['item 1']

      render(<Search {...props} />)
      expect(viewportRef.current.style.pointerEvents).toBe('none')
    })

    it('is false when defaultExpanded is true but suggestions are empty', () => {
      props.pluginConfig.expanded = true
      props.pluginState.isExpanded = false
      props.pluginState.areSuggestionsVisible = true
      props.pluginState.suggestions = []

      render(<Search {...props} />)
      // Should remain 'auto' (or not 'none')
      expect(viewportRef.current.style.pointerEvents).toBe('auto')
    })
  })

  it('cleans up effects and restores pointerEvents on unmount', () => {
    props.pluginState.isExpanded = true
    const { unmount } = render(<Search {...props} />)
    expect(viewportRef.current.style.pointerEvents).toBe('none')

    unmount()
    expect(viewportRef.current.style.pointerEvents).toBe('auto')
  })
})
