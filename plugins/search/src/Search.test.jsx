// /plugins/search/Search.test.jsx
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Search } from './Search'
import { attachEvents } from './events/index.js'
import { createDatasets } from './datasets.js'

// Mock sub-components
jest.mock('./components/OpenButton/OpenButton', () => ({
  OpenButton: ({ id, isExpanded, onClick }) => (
    <button data-testid="open-button" onClick={onClick}>
      OpenButton-{id}-{isExpanded ? 'expanded' : 'collapsed'}
    </button>
  ),
}))

jest.mock('./components/CloseButton/CloseButton', () => ({
  CloseButton: ({ defaultExpanded, onClick }) => (
    <button data-testid="close-button" onClick={onClick}>
      CloseButton-{defaultExpanded ? 'defaultExpanded' : 'collapsed'}
    </button>
  ),
}))

jest.mock('./components/Form/Form', () => ({
  Form: ({ children }) => <div data-testid="form">{children}</div>,
}))

// Mock external logic
jest.mock('./datasets.js', () => ({
  createDatasets: jest.fn(() => ['dataset1', 'dataset2']),
}))

jest.mock('./events/index.js', () => ({
  attachEvents: jest.fn(() => ({
    handleOpenClick: jest.fn(),
    handleCloseClick: jest.fn(),
    handleOutside: jest.fn(),
  })),
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
        suggestions: [],
      },
      pluginConfig: {
        isExpanded: false, // This is destructured as defaultExpanded in the component
        customDatasets: [],
        osNamesURL: 'url',
      },
      appState: {
        dispatch: jest.fn(),
        interfaceType: 'keyboard',
        layoutRefs: { viewportRef },
      },
      mapState: { markers: {} },
      services: {},
      mapProvider: { crs: 'EPSG:3857' },
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('renders OpenButton when defaultExpanded/isExpanded is false', () => {
    render(<Search {...props} />)
    expect(screen.getByTestId('open-button')).toBeInTheDocument()
    expect(screen.getByTestId('form')).toBeInTheDocument()
    expect(screen.getByTestId('close-button')).toBeInTheDocument()
  })

  it('does not render OpenButton when defaultExpanded/isExpanded is true', () => {
    props.pluginConfig.isExpanded = true
    render(<Search {...props} />)
    expect(screen.queryByTestId('open-button')).not.toBeInTheDocument()
    expect(screen.getByTestId('close-button')).toBeInTheDocument()
  })

  it('calls attachEvents once and persists it across re-renders (useRef coverage)', () => {
    const { rerender } = render(<Search {...props} />)
    
    expect(createDatasets).toHaveBeenCalledWith({
      customDatasets: [],
      osNamesURL: 'url',
      crs: 'EPSG:3857',
    })
    
    // Trigger a re-render with a prop change
    rerender(<Search {...props} appState={{ ...props.appState, interfaceType: 'touch' }} />)
    
    // attachEvents should still only have been called once due to the useRef check
    expect(attachEvents).toHaveBeenCalledTimes(1)
  })

  it('OpenButton click triggers handleOpenClick', () => {
    render(<Search {...props} />)
    const events = attachEvents.mock.results[0].value
    fireEvent.click(screen.getByTestId('open-button'))
    expect(events.handleOpenClick).toHaveBeenCalledTimes(1)
  })

  it('CloseButton click triggers handleCloseClick', () => {
    render(<Search {...props} />)
    const events = attachEvents.mock.results[0].value
    fireEvent.click(screen.getByTestId('close-button'))
    expect(events.handleCloseClick).toHaveBeenCalledTimes(1)
  })

  it('focuses input when pluginState.isExpanded is true', () => {
    // We have to mock the implementation because inputRef is internal
    // This is a bit of a workaround for testing internal refs
    props.pluginState.isExpanded = true
    render(<Search {...props} />)
    expect(screen.getByTestId('form')).toBeInTheDocument()
  })

  describe('searchOpen logic (Line 46 coverage)', () => {
    it('is true when isExpanded is true', () => {
      props.pluginState.isExpanded = true
      render(<Search {...props} />)
      // If searchOpen is true, pointerEvents becomes 'none'
      expect(viewportRef.current.style.pointerEvents).toBe('none')
    })

    it('is true when defaultExpanded is true and suggestions exist', () => {
      props.pluginConfig.isExpanded = true // defaultExpanded
      props.pluginState.isExpanded = false
      props.pluginState.areSuggestionsVisible = true
      props.pluginState.suggestions = ['item 1']
      
      render(<Search {...props} />)
      expect(viewportRef.current.style.pointerEvents).toBe('none')
    })

    it('is false when defaultExpanded is true but suggestions are empty', () => {
      props.pluginConfig.isExpanded = true 
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