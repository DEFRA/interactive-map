import React from 'react'
import { mapPanels } from './mapPanels.js'
import { registeredPlugins } from '../registry/pluginRegistry.js'
import { withPluginContexts } from './pluginWrapper.js'
import { mapControls } from './mapControls.js'
import { logger } from '../../services/logger.js'

jest.mock('../../services/logger.js')
jest.mock('../registry/panelRegistry.js')
jest.mock('../registry/pluginRegistry.js', () => ({ registeredPlugins: [] }))
jest.mock('./pluginWrapper.js', () => ({ withPluginContexts: jest.fn((c) => c) }))
jest.mock('./mapControls.js', () => ({ mapControls: jest.fn(() => []) }))
jest.mock('../components/Panel/Panel.jsx', () => ({ Panel: (props) => <div data-testid='panel' {...props} /> }))
jest.mock('./slots.js', () => ({ allowedSlots: { panel: ['header', 'modal', 'left-top'] } }))

describe('mapPanels', () => {
  const baseConfig = {
    desktop: { slot: 'header', order: 1 },
    pluginId: 'plug1'
  }

  let defaultAppState

  const map = (state = defaultAppState, slot = 'header', isHiddenByApplicationMode) =>
    mapPanels({ slot, appState: state, evaluateProp: (prop) => prop, isHiddenByApplicationMode })

  beforeEach(() => {
    jest.clearAllMocks()
    mapControls.mockReturnValue([])
    registeredPlugins.length = 0
    defaultAppState = {
      breakpoint: 'desktop',
      isFullscreen: true,
      openPanels: { p1: { props: { foo: 'bar' } } },
      panelConfig: { p1: baseConfig },
      pluginRegistry: { registeredPlugins: [] }
    }
    defaultAppState.panelConfig = ({ p1: baseConfig })
  })

  it('renders a closed shell (not nothing) for an eligible panel that is not open', () => {
    const result = map({ ...defaultAppState, openPanels: {} })
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ id: 'p1', type: 'panel', order: 1 })
    expect(result[0].element.props.isOpen).toBe(false)
  })

  it('does not build a closed panel\'s body before it opens', () => {
    const renderFn = jest.fn(() => <div>child</div>)
    defaultAppState.panelConfig = ({ p1: { ...baseConfig, render: renderFn } })
    const result = map({ ...defaultAppState, openPanels: {} })
    expect(mapControls).not.toHaveBeenCalled()
    expect(withPluginContexts).not.toHaveBeenCalled()
    expect(result[0].element.props.items).toBeUndefined()
    expect(result[0].element.props.tabs).toBeUndefined()
  })

  it('returns an empty array only when there is nothing eligible for the slot at all', () => {
    expect(map({ ...defaultAppState, panelConfig: {} })).toEqual([])
  })

  it('skips panel if config is missing', () => {
    defaultAppState.panelConfig = ({})
    expect(map()).toEqual([])
  })

  it('skips a registered panelId whose config is falsy', () => {
    defaultAppState.panelConfig = ({ p1: null })
    expect(map()).toEqual([])
  })

  it('skips panel if breakpoint config is missing', () => {
    defaultAppState.panelConfig = ({ p1: {} })
    expect(map()).toEqual([])
  })

  it('skips panel if slot does not match requested slot', () => {
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' } } })
    const state = { ...defaultAppState, openPanels: { p1: { props: {} } } }
    expect(map(state, 'sidebar')).toEqual([])
  })

  it('skips panel if its slot is invalid or it belongs to another slot', () => {
    defaultAppState.panelConfig = ({
      p1: { desktop: { slot: 'invalid' } },
      p4: { desktop: { modal: true } }
    })
    expect(map()).toEqual([])
  })

  it('hides a panel the application mode filter hides, telling it whether the panel is modal', () => {
    const isHiddenByApplicationMode = jest.fn(() => true)
    expect(map(defaultAppState, 'header', isHiddenByApplicationMode)[0].element.props.isHidden).toBe(true)
    expect(isHiddenByApplicationMode).toHaveBeenCalledWith({ ids: ['p1'], pluginId: undefined, isModal: false })
    expect(map(defaultAppState)[0].element.props.isHidden).toBe(false)
    defaultAppState.panelConfig = ({ p1: { desktop: { modal: true } } })
    map(defaultAppState, 'modal', isHiddenByApplicationMode)
    expect(isHiddenByApplicationMode).toHaveBeenLastCalledWith({ ids: ['p1'], pluginId: undefined, isModal: true })
  })

  it('renders both modal panels\' shells but only marks the last-opened one as open', () => {
    defaultAppState.panelConfig = ({
      p1: { desktop: { modal: true } },
      p2: { desktop: { modal: true } }
    })
    const state = {
      ...defaultAppState,
      openPanels: { p1: { props: {} }, p2: { props: {} } }
    }
    const result = map(state, 'modal')
    expect(result.map(r => r.id).sort()).toEqual(['p1', 'p2'])
    expect(result.find(r => r.id === 'p1').element.props.isOpen).toBe(false)
    expect(result.find(r => r.id === 'p2').element.props.isOpen).toBe(true)
  })

  it('wraps render function with plugin context', () => {
    const renderFn = jest.fn(() => <div>child</div>)
    const plugin = { id: 'plug1', config: { a: 1 } }
    registeredPlugins.push(plugin)
    defaultAppState.pluginRegistry = { registeredPlugins: [plugin] }
    defaultAppState.panelConfig = ({ p1: { ...baseConfig, render: renderFn } })
    map()
    expect(withPluginContexts).toHaveBeenCalledWith(
      renderFn,
      expect.objectContaining({
        pluginId: 'plug1',
        pluginConfig: { a: 1 },
        foo: 'bar'
      })
    )
  })

  it('builds an empty items list if there is no render function and no injected controls', () => {
    const result = map()
    expect(result[0].element.props.items).toEqual([])
  })

  it('builds a single-item items list for a panel with its own render content', () => {
    const renderFn = () => <div>child</div>
    defaultAppState.panelConfig = ({ p1: { ...baseConfig, render: renderFn } })
    const result = map()
    expect(result[0].element.props.items).toEqual([
      { id: 'p1', order: 0, element: expect.anything() }
    ])
  })

  it('requests injected controls using the <panelId>-panel slot convention', () => {
    map()
    expect(mapControls).toHaveBeenCalledWith(expect.objectContaining({ slot: 'p1-panel' }))
  })

  it('merges and orders the panel\'s own content with controls injected via mapControls', () => {
    const renderFn = () => <div>child</div>
    mapControls.mockReturnValue([{ id: 'injected1', order: 1, element: <span>injected</span> }])
    defaultAppState.panelConfig = ({ p1: { ...baseConfig, render: renderFn } })
    const result = map()
    // injected1 has order 1, so it's spliced ahead of the panel's own (unordered) content
    expect(result[0].element.props.items.map(i => i.id)).toEqual(['injected1', 'p1'])
  })

  it('returns just the injected controls when the panel has neither render nor html', () => {
    mapControls.mockReturnValue([{ id: 'injected1', order: 0, element: <span>injected</span> }])
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' } } })
    const result = map()
    expect(result[0].element.props.items.map(i => i.id)).toEqual(['injected1'])
  })

  it('does not build an items list for a static-html panel (dangerouslySetInnerHTML can\'t host injected controls)', () => {
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' }, pluginId: 'plug1', html: '<p>Hi</p>' } })
    const result = map()
    expect(result[0].element.props.items).toBeUndefined()
    expect(result[0].element.props.html).toBe('<p>Hi</p>')
  })

  it('warns in dev when controls target a static-html panel', () => {
    mapControls.mockReturnValue([{ id: 'injected1', order: 0, element: <span>injected</span> }])
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' }, pluginId: 'plug1', html: '<p>Hi</p>' } })
    map()
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('p1'))
  })

  it('orders multiple injected controls even when the panel has no render (regression: previously returned mapControls output unordered)', () => {
    mapControls.mockReturnValue([
      { id: 'first', order: 2, element: <span>first</span> },
      { id: 'second', order: 1, element: <span>second</span> }
    ])
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' } } })
    const result = map()
    expect(result[0].element.props.items.map(i => i.id)).toEqual(['second', 'first'])
  })

  describe('tabs', () => {
    it('does not build a tabs list when everything shares one (or no) tab', () => {
      const renderFn = () => <div>child</div>
      mapControls.mockReturnValue([{ id: 'injected1', order: 0, element: <span>injected</span> }])
      defaultAppState.panelConfig = ({ p1: { ...baseConfig, render: renderFn } })
      const result = map()
      expect(result[0].element.props.tabs).toBeUndefined()
      expect(result[0].element.props.items).toBeDefined()
    })

    it('groups the panel\'s own content and an injected control into separate tabs', () => {
      const renderFn = () => <div>child</div>
      mapControls.mockReturnValue([{ id: 'injected1', order: 0, tab: 'Injected', element: <span>injected</span> }])
      defaultAppState.panelConfig = ({
        p1: { ...baseConfig, render: renderFn, desktop: { slot: 'header', order: 1, tab: 'Own' } }
      })
      const result = map()
      expect(result[0].element.props.items).toBeUndefined()
      const tabNames = result[0].element.props.tabs.map(t => t.name)
      expect(tabNames.sort()).toEqual(['Injected', 'Own'])
    })

    it('falls back to the panel\'s own label for its content\'s implicit tab', () => {
      const renderFn = () => <div>child</div>
      mapControls.mockReturnValue([{ id: 'injected1', order: 0, tab: 'Injected', element: <span>injected</span> }])
      defaultAppState.panelConfig = ({
        p1: { ...baseConfig, render: renderFn, label: 'Map styles' }
      })
      const result = map()
      const tabNames = result[0].element.props.tabs.map(t => t.name)
      expect(tabNames).toContain('Map styles')
    })
  })

  it('returns correct structure and defaults', () => {
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' } } })
    const result = map()
    expect(result[0]).toMatchObject({ id: 'p1', type: 'panel', order: 0 })
    expect(result[0].element.props).toMatchObject({ panelId: 'p1', props: { foo: 'bar' } })
  })

  it('allows panel next to a button slot', () => {
    const panelId = 'p-1'
    defaultAppState.panelConfig = ({
      [panelId]: { desktop: { slot: 'p-1-button' } }
    })
    const state = { ...defaultAppState, openPanels: { [panelId]: { props: {} } } }
    expect(map(state, 'p-1-button')).toHaveLength(1)
  })

  it('handles missing plugin config and default modes properly', () => {
    registeredPlugins.push({ id: 'plug1' })
    defaultAppState.panelConfig = ({
      p1: { desktop: { slot: 'header' }, pluginId: 'plug1' }
    })
    expect(map()).toHaveLength(1)
  })

  it('replaces drawer slot with left-top on non-mobile breakpoints', () => {
    defaultAppState.panelConfig = ({
      p1: {
        desktop: { slot: 'drawer' }
      }
    })

    const result = map(defaultAppState, 'left-top')
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('p1')
  })

  it('filters out panels with inline:false when not in fullscreen', () => {
    defaultAppState.isFullscreen = false
    defaultAppState.panelConfig = ({
      p1: { ...baseConfig, inline: false }
    })
    expect(map()).toEqual([])
  })

  it('includes panels with inline:false when in fullscreen', () => {
    defaultAppState.isFullscreen = true
    defaultAppState.panelConfig = ({
      p1: { ...baseConfig, inline: false }
    })
    expect(map().map(p => p.id)).toEqual(['p1'])
  })

  it('includes panels without inline property regardless of fullscreen state', () => {
    defaultAppState.isFullscreen = false
    defaultAppState.panelConfig = ({
      p1: baseConfig
    })
    expect(map().map(p => p.id)).toEqual(['p1'])
  })

  it('filters out consumer HTML panels (handled by HtmlElementHost)', () => {
    defaultAppState.panelConfig = ({
      p1: { desktop: { slot: 'header' }, html: '<p>Hi</p>' }
    })
    expect(map()).toEqual([])
  })
})
