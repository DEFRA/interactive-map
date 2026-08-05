import React from 'react'
import { render } from '@testing-library/react'
import { PluginInits } from './PluginInits.jsx'

import { useButtonStateEvaluator } from '../hooks/useButtonStateEvaluator.js'
import { withPluginApiContexts } from './pluginApiWrapper.js'
import { withPluginContexts } from './pluginWrapper.js'
import { useInterfaceAPI } from '../hooks/useInterfaceAPI.js'
import { useHintsAPI } from '../hooks/useHintsAPI.js'
import { useApp } from '../store/appContext.js'
import { useConfig } from '../store/configContext.js'

// --------------------
// Mocks
// --------------------
jest.mock('./pluginWrapper.js', () => ({
  withPluginContexts: jest.fn((Comp) => Comp || (() => null))
}))

jest.mock('./pluginApiWrapper.js', () => ({
  withPluginApiContexts: jest.fn((fn) => fn),
  usePluginApiState: jest.fn(() => ({ current: {} }))
}))

jest.mock('../hooks/useButtonStateEvaluator.js', () => ({
  useButtonStateEvaluator: jest.fn()
}))

jest.mock('../hooks/useInterfaceAPI.js', () => ({
  useInterfaceAPI: jest.fn()
}))

jest.mock('../hooks/useHintsAPI.js', () => ({
  useHintsAPI: jest.fn()
}))

jest.mock('../hooks/useEvaluateProp.js', () => ({
  useEvaluateProp: jest.fn(() => (x) => x)
}))

jest.mock('../store/appContext.js', () => ({
  useApp: jest.fn()
}))

jest.mock('../store/configContext.js', () => ({
  useConfig: jest.fn()
}))

// --------------------
// Tests
// --------------------
describe('PluginInits', () => {
  let pluginRegistryMock
  const mode = 'view'

  beforeEach(() => {
    jest.clearAllMocks()

    pluginRegistryMock = {
      registeredPlugins: []
    }

    useApp.mockReturnValue({ mode })
    useConfig.mockReturnValue({ pluginRegistry: pluginRegistryMock })
  })

  it('calls useButtonStateEvaluator, useInterfaceAPI and useHintsAPI on render', () => {
    render(<PluginInits />)
    expect(useButtonStateEvaluator).toHaveBeenCalled()
    expect(useInterfaceAPI).toHaveBeenCalled()
    expect(useHintsAPI).toHaveBeenCalled()
  })

  it('renders nothing when no plugins registered', () => {
    const { container } = render(<PluginInits />)
    expect(container.textContent).toBe('')
  })

  it('renders wrapped InitComponent for plugin with InitComponent and valid mode', () => {
    const InitComp = () => <div data-testid='init' />
    const plugin = {
      id: 'plugin1',
      _originalPlugin: {},
      config: { foo: 'bar', api: {} },
      InitComponent: InitComp
    }
    pluginRegistryMock.registeredPlugins.push(plugin)

    const { getByTestId } = render(<PluginInits />)
    expect(getByTestId('init')).toBeTruthy()
    expect(withPluginContexts).toHaveBeenCalledWith(
      InitComp,
      expect.objectContaining({ pluginId: 'plugin1' })
    )
  })

  it('skips plugin without InitComponent', () => {
    pluginRegistryMock.registeredPlugins.push({
      id: 'plugin2',
      _originalPlugin: {},
      config: { foo: 'bar', api: {} }
    })
    const { container } = render(<PluginInits />)
    expect(container.textContent).toBe('')
  })

  it('wraps API functions onto _originalPlugin', () => {
    const mockFn = jest.fn()
    const plugin = {
      id: 'pluginApi',
      _originalPlugin: {},
      config: { foo: 'bar', api: {} },
      InitComponent: () => null,
      api: { testFn: mockFn }
    }
    pluginRegistryMock.registeredPlugins.push(plugin)

    render(<PluginInits />)

    expect(plugin._originalPlugin.testFn).toBeDefined()
    expect(typeof plugin._originalPlugin.testFn).toBe('function')
    expect(withPluginApiContexts).toHaveBeenCalledWith(
      mockFn,
      expect.objectContaining({ pluginId: 'pluginApi' })
    )
  })

  it('handles plugin with api but missing config', () => {
    const mockFn = jest.fn()
    const plugin = { id: 'pluginMissingConfig', _originalPlugin: {}, api: { testFn: mockFn } }
    pluginRegistryMock.registeredPlugins.push(plugin)

    render(<PluginInits />)

    expect(plugin._originalPlugin.testFn).toBeDefined()
    expect(typeof plugin._originalPlugin.testFn).toBe('function')
  })

  it('handles plugin without _originalPlugin gracefully', () => {
    const mockFn = jest.fn()
    pluginRegistryMock.registeredPlugins.push({ id: 'pluginNoOriginal', api: { testFn: mockFn }, config: {} })

    const { container } = render(<PluginInits />)
    expect(container.textContent).toBe('')
  })

  it('respects includeModes and excludeModes for InitComponent rendering', () => {
    const InitComp = () => <div data-testid='initMode' />
    const plugin = {
      id: 'pluginMode',
      _originalPlugin: {},
      config: { includeModes: ['edit'], excludeModes: ['view'], api: {} },
      InitComponent: InitComp
    }
    pluginRegistryMock.registeredPlugins.push(plugin)

    const { container } = render(<PluginInits />)
    expect(container.textContent).toBe('')
  })
})
