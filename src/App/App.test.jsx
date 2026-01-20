import React from 'react'
import { render } from '@testing-library/react'
import { App } from './App.jsx'
import { AppProvider } from './store/AppProvider.jsx'
import { MapProvider } from './store/MapProvider.jsx'
import { ServiceProvider } from './store/ServiceProvider.jsx'
import { PluginProvider } from './store/PluginProvider.jsx'
import { removeLoadingState } from '../InteractiveMap/domStateManager.js'
import { PluginInits } from './renderer/PluginInits.jsx'
import { Layout } from './layout/Layout.jsx'

// --------------------------------------------------
// Shared mock
// --------------------------------------------------
const mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn()
}

// --------------------------------------------------
// Module mocks
// --------------------------------------------------
jest.mock('./store/AppProvider.jsx', () => ({
  AppProvider: jest.fn(({ children, options }) => (
    <div data-testid="app-provider" data-options={JSON.stringify(options)}>
      {children}
    </div>
  ))
}))

jest.mock('./store/MapProvider.jsx', () => ({
  MapProvider: jest.fn(({ children, options }) => (
    <div data-testid="map-provider" data-options={JSON.stringify(options)}>
      {children}
    </div>
  ))
}))

jest.mock('./store/ServiceProvider.jsx', () => ({
  ServiceProvider: jest.fn(({ children }) => (
    <div data-testid="service-provider">{children}</div>
  ))
}))

jest.mock('./store/PluginProvider.jsx', () => ({
  PluginProvider: jest.fn(({ children }) => (
    <div data-testid="plugin-provider">{children}</div>
  ))
}))

jest.mock('./renderer/PluginInits.jsx', () => ({
  PluginInits: jest.fn(() => <div data-testid="plugin-inits" />)
}))

jest.mock('./layout/Layout.jsx', () => ({
  Layout: jest.fn(() => <div data-testid="layout" />)
}))

jest.mock('../InteractiveMap/domStateManager.js', () => ({
  removeLoadingState: jest.fn()
}))

// --------------------------------------------------
// Tests
// --------------------------------------------------
describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders component hierarchy with props', () => {
    const props = { mapProvider: 'test', extraProp: 'value', eventBus: mockEventBus }

    render(<App {...props} />)

    // All components rendered
    expect(AppProvider).toHaveBeenCalled()
    expect(MapProvider).toHaveBeenCalled()
    expect(ServiceProvider).toHaveBeenCalled()
    expect(PluginProvider).toHaveBeenCalled()
    expect(PluginInits).toHaveBeenCalled()
    expect(Layout).toHaveBeenCalled()

    // Verify AppProvider and MapProvider received the correct props
    const appProviderProps = AppProvider.mock.calls[0][0]
    const mapProviderProps = MapProvider.mock.calls[0][0]

    expect(appProviderProps.options).toEqual(expect.objectContaining({
      mapProvider: 'test',
      extraProp: 'value'
    }))
    expect(mapProviderProps.options).toEqual(expect.objectContaining({
      mapProvider: 'test',
      extraProp: 'value'
    }))

    // Verify eventBus exists
    expect(appProviderProps.options.eventBus).toBe(mockEventBus)
    expect(mapProviderProps.options.eventBus).toBe(mockEventBus)
  })

  test('calls removeLoadingState and emits APP_READY on mount', () => {
    render(<App eventBus={mockEventBus} />)

    expect(removeLoadingState).toHaveBeenCalledTimes(1)
    expect(mockEventBus.emit).toHaveBeenCalledWith('app:ready')
    expect(mockEventBus.emit).toHaveBeenCalledTimes(1)
  })

  test('useEffect runs only once', () => {
    const { rerender } = render(<App eventBus={mockEventBus} />)

    // Rerender with different props
    rerender(<App eventBus={mockEventBus} newProp="test" />)

    // Should still only be called once due to empty dependency array
    expect(removeLoadingState).toHaveBeenCalledTimes(1)
    expect(mockEventBus.emit).toHaveBeenCalledTimes(1)
  })

  test('providers called with correct props', () => {
    const testProps = { mapFramework: 'leaflet', config: { zoom: 10 }, eventBus: mockEventBus }

    render(<App {...testProps} />)

    expect(AppProvider).toHaveBeenCalledTimes(1)
    expect(MapProvider).toHaveBeenCalledTimes(1)
    expect(ServiceProvider).toHaveBeenCalledTimes(1)
    expect(PluginProvider).toHaveBeenCalledTimes(1)

    const appProviderCall = AppProvider.mock.calls[0][0]
    const mapProviderCall = MapProvider.mock.calls[0][0]

    expect(appProviderCall.options).toEqual(testProps)
    expect(mapProviderCall.options).toEqual(testProps)
    expect(appProviderCall.children).toBeDefined()
    expect(mapProviderCall.children).toBeDefined()
  })
})
