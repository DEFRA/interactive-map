import React from 'react'
import { renderHook } from '@testing-library/react'
import { useEvaluateProp } from './useEvaluateProp.js'
import * as configStore from '../store/configContext.js'
import * as appStore from '../store/appContext.js'
import * as mapStore from '../store/mapContext.js'
import * as serviceStore from '../store/serviceContext.js'
import { PluginContext } from '../store/PluginProvider.jsx'
import * as iconRegistryModule from '../registry/iconRegistry.js'

jest.mock('../store/configContext.js', () => ({ useConfig: jest.fn() }))
jest.mock('../store/appContext.js', () => ({ useApp: jest.fn() }))
jest.mock('../store/mapContext.js', () => ({ useMap: jest.fn() }))
jest.mock('../store/serviceContext.js', () => ({ useService: jest.fn() }))
jest.mock('../registry/iconRegistry.js', () => ({ getIconRegistry: jest.fn() }))

const RAW_VALUE = 'raw-test-value'
const pluginDispatch = jest.fn()
const pluginContextValue = {
  state: { myPlugin: { foo: 'bar' } },
  dispatch: pluginDispatch
}
const mockPluginRegistry = {
  registeredPlugins: [],
  registerPlugin: jest.fn(),
  clear: jest.fn()
}

const withPluginContext = ({ children }) => (
  <PluginContext.Provider value={pluginContextValue}>
    {children}
  </PluginContext.Provider>
)

beforeEach(() => {
  jest.clearAllMocks()
  mockPluginRegistry.registeredPlugins = []
  configStore.useConfig.mockReturnValue({ mapProvider: { name: 'leaflet' }, pluginRegistry: mockPluginRegistry })
  appStore.useApp.mockReturnValue({ user: 'alice' })
  mapStore.useMap.mockReturnValue({ zoom: 5 })
  serviceStore.useService.mockReturnValue({ reverseGeocode: jest.fn() })
  iconRegistryModule.getIconRegistry.mockReturnValue({ close: '<svg/>' })
})

describe('useEvaluateProp — basic evaluation', () => {
  it('returns the raw prop if it is not a function', () => {
    const { result } = renderHook(() => useEvaluateProp())
    expect(result.current(RAW_VALUE)).toBe(RAW_VALUE)
  })

  it('calls prop function with full context when no pluginId provided', () => {
    const { result } = renderHook(() => useEvaluateProp())
    const fn = jest.fn(ctx => ctx.appState.user)
    expect(result.current(fn)).toBe('alice')
    expect(fn.mock.calls[0][0]).toMatchObject({
      appConfig: { mapProvider: { name: 'leaflet' } },
      appState: { user: 'alice' },
      mapState: { zoom: 5 },
      services: { reverseGeocode: expect.any(Function) },
      mapProvider: { name: 'leaflet' },
      iconRegistry: { close: '<svg/>' }
    })
  })

  it('exposes ctx property on the returned evaluateProp function', () => {
    const { result } = renderHook(() => useEvaluateProp())
    expect(result.current.ctx).toMatchObject({
      appConfig: { mapProvider: { name: 'leaflet' } },
      appState: { user: 'alice' },
      mapState: { zoom: 5 },
      services: { reverseGeocode: expect.any(Function) },
      mapProvider: { name: 'leaflet' },
      iconRegistry: { close: '<svg/>' }
    })
  })
})

describe('useEvaluateProp — pluginStates (core/framework buttons)', () => {
  it('includes pluginStates in context when no pluginId provided', () => {
    const { result } = renderHook(() => useEvaluateProp(), { wrapper: withPluginContext })
    expect(result.current(ctx => ctx.pluginStates)).toEqual({ myPlugin: { foo: 'bar' } })
  })

  it('includes pluginStates for appConfig plugin (no reducer, not in state)', () => {
    mockPluginRegistry.registeredPlugins.push({ id: 'appConfig', config: {} })
    const { result } = renderHook(() => useEvaluateProp(), { wrapper: withPluginContext })
    expect(result.current(ctx => ctx.pluginStates, 'appConfig')).toEqual({ myPlugin: { foo: 'bar' } })
  })

  it('falls back to empty pluginStates when PluginContext is not provided', () => {
    mockPluginRegistry.registeredPlugins.push({ id: 'appConfig', config: {} })
    const { result } = renderHook(() => useEvaluateProp())
    expect(result.current(ctx => ctx.pluginStates, 'appConfig')).toEqual({})
  })
})

describe('useEvaluateProp — plugin state isolation', () => {
  it('includes pluginConfig and pluginState for real plugin buttons', () => {
    mockPluginRegistry.registeredPlugins.push({ id: 'myPlugin', config: { includeModes: ['edit'], excludeModes: ['view'] } })
    const { result } = renderHook(() => useEvaluateProp(), { wrapper: withPluginContext })
    const ctx = result.current(c => c, 'myPlugin')
    expect(ctx.pluginConfig).toEqual({ pluginId: 'myPlugin', includeModes: ['edit'], excludeModes: ['view'] })
    expect(ctx.pluginState).toMatchObject({ foo: 'bar', dispatch: expect.any(Function) })
  })

  it('scopes pluginState.dispatch to the plugin by injecting pluginId', () => {
    mockPluginRegistry.registeredPlugins.push({ id: 'myPlugin', config: {} })
    const { result } = renderHook(() => useEvaluateProp(), { wrapper: withPluginContext })
    const ctx = result.current(c => c, 'myPlugin')
    ctx.pluginState.dispatch({ type: 'DO_THING', payload: 1 })
    expect(pluginDispatch).toHaveBeenCalledWith({ type: 'DO_THING', payload: 1, pluginId: 'myPlugin' })
  })

  it('does not include pluginStates for real plugin buttons', () => {
    mockPluginRegistry.registeredPlugins.push({ id: 'myPlugin', config: {} })
    const { result } = renderHook(() => useEvaluateProp(), { wrapper: withPluginContext })
    expect(result.current(ctx => ctx.pluginStates, 'myPlugin')).toBeUndefined()
  })

  it('returns empty pluginConfig if plugin not registered', () => {
    const { result } = renderHook(() => useEvaluateProp(), { wrapper: withPluginContext })
    expect(result.current(ctx => ctx.pluginConfig, 'unknownPlugin')).toEqual({})
  })

  it('falls back to empty object when plugin state entry is null', () => {
    mockPluginRegistry.registeredPlugins.push({ id: 'myPlugin', config: {} })
    const wrapper = ({ children }) => (
      <PluginContext.Provider value={{ state: { myPlugin: null }, dispatch: pluginDispatch }}>
        {children}
      </PluginContext.Provider>
    )
    const { result } = renderHook(() => useEvaluateProp(), { wrapper })
    const ctx = result.current(c => c, 'myPlugin')
    expect(ctx.pluginState).toMatchObject({ dispatch: expect.any(Function) })
  })
})
