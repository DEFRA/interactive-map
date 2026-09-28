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

  it('filters out controls when excludeWhen evaluates truthy', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, excludeWhen: () => true }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p() })
    expect(result).toEqual([])
  })

  it('includes controls when excludeWhen evaluates falsy', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, excludeWhen: () => false }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p() })
    expect(result.map(c => c.id)).toEqual(['ctrl1'])
  })

  it('ignores excludeWhen when it is not a function', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, excludeWhen: true }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p() })
    expect(result.map(c => c.id)).toEqual(['ctrl1'])
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
    // Rendered inside the core wrapper exclusive control hides it by
    expect(result[0].element.type).toBe('div')
    expect(typeof result[0].element.props.children.type).toBe('function')
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

  it('hides an HTML control (keeping it mounted) when exclusive control doesn\'t keep it', () => {
    defaultAppState.controlConfig = ({
      ctrlHtml: { id: 'ctrlHtml', pluginId: 'plugin1', desktop: { slot: 'header' }, html: '<p>Hi</p>', includeModes: ['view'] }
    })
    const style = () => mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })[0].element.props.style
    expect(style()).toBeUndefined()
    defaultAppState.exclusiveControl = [{ pluginId: 'draw', name: null, keep: [] }]
    expect(style()).toEqual({ display: 'none' })
    defaultAppState.exclusiveControl = [{ pluginId: 'draw', name: null, keep: ['ctrlHtml'] }]
    expect(style()).toBeUndefined()
  })

  it('gives a plugin control\'s wrapper a kebab-cased id modifier, like button wrappers', () => {
    defaultAppState.controlConfig = ({
      scaleBar: { id: 'scaleBar', desktop: { slot: 'header' }, render: () => null, includeModes: ['view'] }
    })
    const [item] = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(item.element.props.className).toBe('im-c-control-wrapper im-c-control-wrapper--scale-bar')
  })

  it('always wraps a plugin control, switching the wrapper to display: none when exclusive control hides it', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header' }, render: () => null, includeModes: ['view'] }
    })
    const wrapper = () => mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })[0].element
    expect(wrapper().props).toMatchObject({ className: 'im-c-control-wrapper im-c-control-wrapper--ctrl1', style: { display: 'contents' } })
    defaultAppState.exclusiveControl = [{ pluginId: 'draw', name: null, keep: ['mapStyles'] }]
    expect(wrapper().props).toMatchObject({ className: 'im-c-control-wrapper im-c-control-wrapper--ctrl1 im-c-control-wrapper--hidden', style: { display: 'none' } })
    // The claiming plugin's own controls stay
    defaultAppState.exclusiveControl = [{ pluginId: 'plugin1', name: null, keep: [] }]
    expect(wrapper().props.style).toEqual({ display: 'contents' })
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

  it('matches a control targeting a panel-body slot via the <panelId>-panel convention', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'map-styles-panel', order: 1 }, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'map-styles-panel', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result.map(c => c.id)).toEqual(['ctrl1'])
  })

  it('does not match a panel-body-targeting control against an unrelated slot', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'map-styles-panel', order: 1 }, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result).toEqual([])
  })

  it('passes through the tab field from the breakpoint config', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'map-styles-panel', tab: 'Styles' }, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'map-styles-panel', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result[0].tab).toBe('Styles')
  })

  it('leaves tab undefined when not set on the breakpoint config', () => {
    defaultAppState.controlConfig = ({
      ctrl1: { id: 'ctrl1', desktop: { slot: 'header', order: 1 }, includeModes: ['view'] }
    })
    const result = mapControls({ slot: 'header', appState: defaultAppState, evaluateProp: (p) => p })
    expect(result[0].tab).toBeUndefined()
  })
})
