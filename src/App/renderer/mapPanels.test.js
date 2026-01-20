import React from 'react'
import { mapPanels } from './mapPanels.js'
import { registeredPlugins } from '../registry/pluginRegistry.js'
import { withPluginContexts } from './pluginWrapper.js'

jest.mock('../registry/panelRegistry.js')
jest.mock('../registry/pluginRegistry.js', () => ({ registeredPlugins: [] }))
jest.mock('./pluginWrapper.js', () => ({ withPluginContexts: jest.fn((c) => c) }))
jest.mock('../components/Panel/Panel.jsx', () => ({ Panel: (props) => <div data-testid='panel' {...props} /> }))
jest.mock('./slots.js', () => ({ allowedSlots: { panel: ['header', 'modal', 'inset'] } }))

describe('mapPanels', () => {
  const baseConfig = {
    desktop: { slot: 'header', order: 1 },
    includeModes: ['view'],
    pluginId: 'plug1'
  }

  let defaultAppState

  const map = (state = defaultAppState, slot = 'header') =>
    mapPanels({ slot, appState: state, evaluateProp: (p) => p })

  beforeEach(() => {
    jest.clearAllMocks()
    registeredPlugins.length = 0
    defaultAppState = {
      breakpoint: 'desktop',
      mode: 'view',
      isFullscreen: true,
      openPanels: { p1: { props: { foo: 'bar' } } },
      panelConfig: { p1: baseConfig },
      pluginRegistry: { registeredPlugins: [] }
    }
    defaultAppState.panelConfig = ({ p1: baseConfig })
  })

  it('returns empty array when no panels are open', () => {
    expect(map({ ...defaultAppState, openPanels: {} })).toEqual([])
  })

  it('skips panel if config is missing', () => {
    defaultAppState.panelConfig = ({})
    expect(map()).toEqual([])
  })

  it('skips panel if breakpoint config is missing', () => {
    defaultAppState.panelConfig = ({ p1: {} })
    expect(map()).toEqual([])
  })

  it('skips panel if slot does not match requested slot', () => {
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' }, includeModes: ['view'] } })
    const state = { ...defaultAppState, openPanels: { p1: { props: {} } } }
    expect(map(state, 'sidebar')).toEqual([])
  })

  it('skips panel if mode does not match includeModes/excludeModes or slot invalid', () => {
    defaultAppState.panelConfig = ({
      p1: { desktop: { slot: 'invalid' }, includeModes: ['view'] },
      p2: { desktop: { slot: 'header' }, includeModes: ['edit'] },
      p3: { desktop: { slot: 'header' }, excludeModes: ['view'] },
      p4: { desktop: { modal: true }, includeModes: ['view'] }
    })
    expect(map()).toEqual([])
  })

  it('only allows last opened modal panel', () => {
    defaultAppState.panelConfig = ({
      p1: { desktop: { modal: true }, includeModes: ['view'] },
      p2: { desktop: { modal: true }, includeModes: ['view'] }
    })
    const state = {
      ...defaultAppState,
      openPanels: { p1: { props: {} }, p2: { props: {} } }
    }
    expect(map(state, 'modal').map(r => r.id)).toEqual(['p2'])
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

  it('sets WrappedChild null if no render function', () => {
    const result = map()
    expect(result[0].element.props.WrappedChild).toBeNull()
  })

  it('returns correct structure and defaults', () => {
    defaultAppState.panelConfig = ({ p1: { desktop: { slot: 'header' }, includeModes: ['view'] } })
    const result = map()
    expect(result[0]).toMatchObject({ id: 'p1', type: 'panel', order: 0 })
    expect(result[0].element.props).toMatchObject({ panelId: 'p1', props: { foo: 'bar' } })
  })

  it('allows panel next to a button slot', () => {
    const panelId = 'p-1'
    defaultAppState.panelConfig = ({
      [panelId]: { desktop: { slot: 'p-1-button' }, includeModes: ['view'] }
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

  it('replaces bottom slot with inset on non-mobile breakpoints', () => {
    defaultAppState.panelConfig = ({
      p1: {
        desktop: { slot: 'bottom' },
        includeModes: ['view']
      }
    })

    const result = map(defaultAppState, 'inset')
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
})
