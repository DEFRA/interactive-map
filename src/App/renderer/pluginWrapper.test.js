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
    const Wrapped = withPluginContexts(Inner)

    render(<Wrapped pluginId='plugin1' pluginConfig={{ foo: 'bar' }} customProp='xyz' />)

    expect(Inner).toHaveBeenCalled()

    const props = Inner.mock.calls[0][0]
    expect(props).not.toHaveProperty('pluginId')
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

  describe('application mode helpers', () => {
    const setup = () => {
      const dispatch = jest.fn()
      require('../store/appContext.js').useApp.mockReturnValue({ buttonConfig: {}, dispatch })
      const Inner = jest.fn(() => <div>Inner</div>)
      const Wrapped = withPluginContexts(Inner)
      const { rerender } = render(<Wrapped pluginId='plugin1' pluginConfig={{}} />)
      return { dispatch, Inner, Wrapped, rerender }
    }

    afterEach(() => {
      require('../store/appContext.js').useApp.mockReturnValue({ user: 'testUser', buttonConfig: {} })
    })

    it('sets a mode with its lists', () => {
      const { dispatch, Inner } = setup()
      Inner.mock.calls[0][0].setApplicationMode('draw', { include: ['mapStyles'] })
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_APPLICATION_MODE',
        payload: { id: 'draw', include: ['mapStyles'], exclude: null }
      })
    })

    it('defaults both lists to null', () => {
      const { dispatch, Inner } = setup()
      Inner.mock.calls[0][0].setApplicationMode('search')
      expect(dispatch).toHaveBeenCalledWith({
        type: 'SET_APPLICATION_MODE',
        payload: { id: 'search', include: null, exclude: null }
      })
    })

    it('clears a mode', () => {
      const { dispatch, Inner } = setup()
      Inner.mock.calls[0][0].clearApplicationMode('draw')
      expect(dispatch).toHaveBeenCalledWith({ type: 'CLEAR_APPLICATION_MODE', payload: 'draw' })
    })

    it('passes the same functions on every render, so effects can depend on them', () => {
      const { Inner, Wrapped, rerender } = setup()
      rerender(<Wrapped pluginId='plugin1' pluginConfig={{}} />)
      const [firstProps, secondProps] = Inner.mock.calls.map(([props]) => props)
      expect(secondProps.setApplicationMode).toBe(firstProps.setApplicationMode)
      expect(secondProps.clearApplicationMode).toBe(firstProps.clearApplicationMode)
    })
  })

  it('returns the cached wrapper if called again with the same component', () => {
    const Inner = jest.fn(() => <div>Inner</div>)
    const Wrapped1 = withPluginContexts(Inner)
    const Wrapped2 = withPluginContexts(Inner)

    expect(Wrapped2).toBe(Wrapped1)
  })

  it('gives each map its own plugin config when maps share a component', () => {
    const Inner = jest.fn(() => <div>Inner</div>)
    const WrappedMapA = withPluginContexts(Inner)
    const WrappedMapB = withPluginContexts(Inner)

    render(<WrappedMapA pluginId='datasets' pluginConfig={{ datasets: ['map-a'] }} />)
    render(<WrappedMapB pluginId='datasets' pluginConfig={{ datasets: ['map-b'] }} />)

    expect(WrappedMapB).toBe(WrappedMapA)
    expect(Inner.mock.calls[0][0].pluginConfig).toEqual({ datasets: ['map-a'] })
    expect(Inner.mock.calls[1][0].pluginConfig).toEqual({ datasets: ['map-b'] })
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

    const Wrapped = withPluginContexts(Inner)

    render(<Wrapped pluginId='plugin1' pluginConfig={{ foo: 'bar' }} customProp='xyz' />)

    const props = Inner.mock.calls[0][0]

    // buttonConfig should include only buttons belonging to plugin1
    expect(props.buttonConfig).toEqual({
      btn1: { label: 'A', pluginId: 'plugin1' }
    })
  })
})
