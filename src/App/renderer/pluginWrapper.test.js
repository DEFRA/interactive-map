import React from 'react'
import { render } from '@testing-library/react'
import { withPluginContexts, wrapperCache } from './pluginWrapper.js'

// Mock hooks
jest.mock('../store/configContext.js', () => ({ useConfig: jest.fn(() => ({ mapProvider: 'mockMap' })) }))
jest.mock('../store/appContext.js', () => ({ useApp: jest.fn(() => ({ user: 'testUser', buttonConfig: {} })) }))
jest.mock('../store/mapContext.js', () => ({ useMap: jest.fn(() => ({ center: [0, 0] })) }))
jest.mock('../store/serviceContext.js', () => ({ useService: jest.fn(() => ({ eventBus: {} })) }))
jest.mock('../store/PluginProvider.jsx', () => ({ usePlugin: jest.fn(() => ({ pluginStateVal: true })) }))

describe('withPluginContexts', () => {
  beforeEach(() => {
    // reset wrapper cache so the "if (!wrapperCache.has(key))" branch runs
    wrapperCache.clear()
  })

  it('creates a new wrapper and injects all contexts and plugin config/state', () => {
    const Inner = jest.fn(() => <div>Inner</div>)
    const Wrapped = withPluginContexts(Inner, { pluginId: 'plugin1', pluginConfig: { foo: 'bar' } })

    render(<Wrapped customProp='xyz' />)

    expect(Inner).toHaveBeenCalled()

    const props = Inner.mock.calls[0][0]
    expect(props).toEqual(expect.objectContaining({
      customProp: 'xyz',
      pluginConfig: { foo: 'bar' },
      pluginState: { pluginStateVal: true },
      appConfig: { mapProvider: 'mockMap' },
      appState: { user: 'testUser', buttonConfig: {} },
      mapState: { center: [0, 0] },
      services: { eventBus: {} },
      mapProvider: 'mockMap',
      buttonConfig: {}
    }))
  })

  it('returns the cached wrapper if called again with the same component', () => {
    const Inner = jest.fn(() => <div>Inner</div>)
    const Wrapped1 = withPluginContexts(Inner, { pluginId: 'plugin1', pluginConfig: { foo: 'bar' } })
    const Wrapped2 = withPluginContexts(Inner, { pluginId: 'plugin1', pluginConfig: { foo: 'bar' } })

    expect(Wrapped2).toBe(Wrapped1)
  })

  it('filters buttonConfig by pluginId', () => {
    const Inner = jest.fn(() => <div>Inner</div>)

    // Provide a buttonConfig with buttons for multiple plugins
    const appStateMock = {
      user: 'testUser',
      buttonConfig: {
        btn1: { label: 'A', pluginId: 'plugin1' },
        btn2: { label: 'B', pluginId: 'plugin2' }
      }
    }

    // Override the useApp hook for this test
    const { useApp } = require('../store/appContext.js')
    useApp.mockImplementation(() => appStateMock)

    const Wrapped = withPluginContexts(Inner, { pluginId: 'plugin1', pluginConfig: { foo: 'bar' } })

    render(<Wrapped customProp='xyz' />)

    const props = Inner.mock.calls[0][0]

    // buttonConfig should include only buttons belonging to plugin1
    expect(props.buttonConfig).toEqual({
      btn1: { label: 'A', pluginId: 'plugin1' }
    })
  })
})
