import React from 'react'
import { mapControls } from './mapControls.js'

jest.mock('../registry/controlRegistry.js')
jest.mock('../registry/pluginRegistry.js', () => ({
  registeredPlugins: [
    { id: 'plugin1', manifest: { controls: [{ id: 'ctrl1' }] }, config: { foo: 'bar' } }
  ]
}))
jest.mock('./pluginWrapper.js', () => ({
  withPluginContexts: jest.fn((Comp) => Comp || (() => null))
}))
jest.mock('./slots.js', () => ({
  allowedSlots: { control: ['header', 'sidebar'] }
}))

describe('mapControls', () => {
  let defaultAppState

  beforeEach(() => {
    jest.clearAllMocks()
    defaultAppState = {
      breakpoint: 'desktop',
      mode: 'view',
      isFullscreen: true,
      controlConfig: {},
      pluginRegistry: {
        registeredPlugins: [
          { id: 'plugin1', manifest: { controls: [{ id: 'ctrl1' }] }, config: { foo: 'bar' } }
        ]
      }
    }
  })

  it('returns empty array when no controls are defined', () => {
    defaultAppState.controlConfig = ({})
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('filters controls by slot and allowedSlots', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, includeModes: ['view'] },
      ctrl2: { id: 'ctrl2', desktop: { slot: 'footer', order: 2 }, includeModes: ['view'] } // filtered out
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result.map(c => c.id)).toEqual(['ctrl1'])
  })

  it('filters out controls missing breakpoint config', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', mobile: { slot: 'header', order: 1 }, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('filters by includeModes whitelist', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, includeModes: ['edit'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('filters by excludeModes', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, excludeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('maps plugin controls to wrapped component with correct order', () => {
    const renderFn = () => <div>Control</div>
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 5 }, render: renderFn, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result[0].order).toBe(5)
    expect(result[0].id).toBe('ctrl1')
    expect(typeof result[0].element.type).toBe('function')
  })

  it('falls back to order 0 if order is missing', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header' }, render: () => <div />, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result[0].order).toBe(0)
  })

  it('renders plugin HTML controls with dangerouslySetInnerHTML', () => {
    defaultAppState.controlConfig = ({
      ctrlHtml: { id: 'ctrlHtml', pluginId: 'plugin1', desktop: { slot: 'header' }, html: '<p>Hi</p>', includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result[0].element.props.dangerouslySetInnerHTML).toEqual({ __html: '<p>Hi</p>' })
  })

  it('filters out consumer HTML controls (handled by HtmlElementHost)', () => {
    defaultAppState.controlConfig = ({
      ctrlHtml: { id: 'ctrlHtml', desktop: { slot: 'header' }, html: '<p>Hi</p>', includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('handles plugin-less controls gracefully', () => {
    defaultAppState.controlConfig = ({
      ctrl2: { id: 'ctrl2', desktop: { slot: 'header' }, render: () => <div />, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result[0].element).toBeDefined()
  })

  it('filters out controls with inline:false when not in fullscreen', () => {
    defaultAppState.isFullscreen = false
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, includeModes: ['view'], inline: false }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('includes controls with inline:false when in fullscreen', () => {
    defaultAppState.isFullscreen = true
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, includeModes: ['view'], inline: false }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result.map(c => c.id)).toEqual(['ctrl1'])
  })

  it('includes controls without inline property regardless of fullscreen state', () => {
    defaultAppState.isFullscreen = false
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result.map(c => c.id)).toEqual(['ctrl1'])
  })
})
