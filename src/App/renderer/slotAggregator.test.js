import { getItemsBySlot } from './slotAggregator.js'
jest.mock('../components/MapButton/MapButton.jsx', () => ({ MapButton: () => null }))
jest.mock('../components/Panel/Panel.jsx', () => ({ Panel: () => null }))
jest.mock('./pluginWrapper.js', () => ({ withPluginContexts: jest.fn((Comp) => Comp || (() => null)) }))

describe('getItemsBySlot', () => {
  let appState
  let excludeWhen

  const evaluateProp = jest.fn((prop) => typeof prop === 'function' ? prop({}) : prop)
  const build = () => getItemsBySlot({ appState, appConfig: { id: 'test' }, evaluateProp })
  const ids = (items) => items.map(item => item.id)

  beforeEach(() => {
    jest.clearAllMocks()
    excludeWhen = {
      kept: jest.fn(() => false),
      excluded: jest.fn(() => true),
      search: jest.fn(() => false),
      resultsControl: jest.fn(() => false),
      topControl: jest.fn(() => false)
    }
    appState = {
      breakpoint: 'desktop',
      isFullscreen: true,
      openPanels: { results: { props: {} } },
      disabledButtons: new Set(),
      hiddenButtons: new Set(),
      pressedButtons: new Set(),
      expandedButtons: new Set(),
      pluginRegistry: { registeredPlugins: [] },
      buttonConfig: {
        kept: { label: 'Kept', excludeWhen: excludeWhen.kept, desktop: { slot: 'top-left' } },
        excluded: { label: 'Excluded', excludeWhen: excludeWhen.excluded, desktop: { slot: 'top-left' } },
        search: { label: 'Search', panelId: 'results', excludeWhen: excludeWhen.search, desktop: { slot: 'top-right' } },
        menuItem: { label: 'Menu item', isMenuItem: true, desktop: { slot: 'top-left' } }
      },
      panelConfig: {
        results: { label: 'Results', desktop: { slot: 'search-button' } }
      },
      controlConfig: {
        resultsControl: { id: 'resultsControl', excludeWhen: excludeWhen.resultsControl, desktop: { slot: 'results-panel' } },
        topControl: { id: 'topControl', excludeWhen: excludeWhen.topControl, desktop: { slot: 'top-right', order: 1 } }
      }
    }
  })

  it('groups items by slot, including a button\'s nested <buttonId>-button slot', () => {
    const bySlot = build()
    expect(ids(bySlot.get('top-left'))).toEqual(['kept'])
    expect(ids(bySlot.get('search-button'))).toEqual(['results'])
    expect(bySlot.has('header')).toBe(false)
  })

  it('orders each slot\'s controls, panels and buttons together', () => {
    // topControl's order 1 splices it ahead of the unordered search button
    expect(ids(build().get('top-right'))).toEqual(['topControl', 'search'])
  })

  it('renders a control in a <panelId>-panel slot in that panel\'s body', () => {
    const [panel] = build().get('search-button')
    expect(ids(panel.element.props.items)).toEqual(['resultsControl'])
  })

  it('runs each excludeWhen once, however many slots there are', () => {
    build()
    Object.values(excludeWhen).forEach(fn => expect(fn).toHaveBeenCalledTimes(1))
  })

  it('returns an empty map when nothing is configured', () => {
    appState = { ...appState, buttonConfig: {}, panelConfig: {}, controlConfig: {} }
    expect(build().size).toBe(0)
  })
})
