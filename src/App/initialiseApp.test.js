import React from 'react'
import { initialiseApp } from './initialiseApp.js'
import { createRoot } from 'react-dom/client'
import { EVENTS as events } from '../config/events.js'
import { createMockRegistries } from '../test-utils.js'

// --------------------------------------------------
// Shared mocks
// --------------------------------------------------
let mockRegistries

const mockEventBus = {
  on: jest.fn(),
  off: jest.fn(),
  emit: jest.fn()
}

beforeEach(() => {
  mockRegistries = createMockRegistries()
  jest.clearAllMocks()
})

// --------------------------------------------------
// Module mocks
// --------------------------------------------------
jest.mock('react-dom/client', () => ({
  createRoot: jest.fn(() => ({
    render: jest.fn(),
    unmount: jest.fn()
  }))
}))

jest.mock('./registry/buttonRegistry.js', () => ({
  createButtonRegistry: jest.fn(() => mockRegistries.buttonRegistry)
}))

jest.mock('./registry/panelRegistry.js', () => ({
  createPanelRegistry: jest.fn(() => mockRegistries.panelRegistry)
}))

jest.mock('./registry/controlRegistry.js', () => ({
  createControlRegistry: jest.fn(() => mockRegistries.controlRegistry)
}))

jest.mock('./registry/pluginRegistry.js', () => ({
  createPluginRegistry: jest.fn(() => mockRegistries.pluginRegistry)
}))

jest.mock('./registry/keyboardShortcutRegistry.js', () => ({
  createKeyboardShortcutRegistry: jest.fn(() => mockRegistries.keyboardShortcutRegistry)
}))

jest.mock('./registry/mergeManifests.js', () => ({
  mergeManifests: jest.fn((base, override) => ({ ...base, ...override }))
}))

jest.mock('./App.jsx', () => ({
  App: jest.fn(() => <div>App</div>)
}))

// --------------------------------------------------
// Test helpers
// --------------------------------------------------
const createMapProviderMock = (capabilities) =>
  jest.fn(function ({ mapFramework, eventBus, events: evt, mapProviderConfig }) {
    this.mapFramework = mapFramework
    this.eventBus = eventBus
    this.events = evt
    this.mapProviderConfig = mapProviderConfig
    if (capabilities) this.capabilities = capabilities
  })

const createPlugin = (overrides = {}) => ({
  id: 'plugin1',
  load: jest.fn(() =>
    Promise.resolve({
      manifest: { version: '1.0' },
      api: { foo: jest.fn() },
      ...overrides
    })
  ),
  manifest: overrides.overrideManifest ?? {}
})

// --------------------------------------------------
// Tests
// --------------------------------------------------
describe('initialiseApp', () => {
  let rootElement
  let MapProviderMock

  const initApp = (overrides = {}) =>
    initialiseApp(rootElement, {
      MapProvider: MapProviderMock,
      mapFramework: 'test',
      eventBus: mockEventBus,
      plugins: [],
      ...overrides
    })

  beforeEach(() => {
    rootElement = document.createElement('div')
    MapProviderMock = createMapProviderMock({
      supportedShortcuts: ['ctrl+a']
    })
  })

  test('initialises app and wires dependencies', async () => {
    const appInstance = await initApp({ foo: 'bar' })

    expect(MapProviderMock).toHaveBeenCalledWith({
      mapFramework: 'test',
      mapProviderConfig: undefined,
      events,
      eventBus: mockEventBus
    })

    expect(mockRegistries.pluginRegistry.registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'appConfig' })
    )

    const rendered = createRoot.mock.results[0].value.render.mock.calls[0][0]

    expect(rendered.props.foo).toBe('bar')

    expect(appInstance.on).toBe(mockEventBus.on)
    expect(appInstance.emit).toBe(mockEventBus.emit)

    appInstance.unmount()

    expect(mockRegistries.pluginRegistry.clear).toHaveBeenCalled()
  })

  test('loads and registers plugin', async () => {
    const plugin = createPlugin({ overrideManifest: { extra: true } })

    await initApp({ plugins: [plugin] })

    expect(plugin.load).toHaveBeenCalled()
    expect(mockRegistries.pluginRegistry.registerPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ _originalPlugin: plugin })
    )
  })

  test('skips plugins without load', async () => {
    await initApp({ plugins: [{ id: 'noLoad' }] })

    expect(mockRegistries.pluginRegistry.registerPlugin).toHaveBeenCalledTimes(1)
  })

  test('reuses cached root and provider', async () => {
    await initApp()
    jest.clearAllMocks()
    await initApp()

    expect(MapProviderMock).not.toHaveBeenCalled()
    expect(createRoot).not.toHaveBeenCalled()
  })

  test('creates separate instances per root', async () => {
    await initialiseApp(document.createElement('div'), {
      MapProvider: MapProviderMock,
      mapFramework: 'test',
      eventBus: mockEventBus
    })

    await initialiseApp(document.createElement('div'), {
      MapProvider: MapProviderMock,
      mapFramework: 'test',
      eventBus: mockEventBus
    })

    expect(MapProviderMock).toHaveBeenCalledTimes(2)
  })

  test('does not register shortcuts when unsupported', async () => {
    MapProviderMock = createMapProviderMock()

    await initApp()

    expect(mockRegistries.keyboardShortcutRegistry.setProviderSupportedShortcuts).not.toHaveBeenCalled()
  })

  test('registers provider-supported shortcuts on the per-instance registry', async () => {
    await initApp()

    expect(mockRegistries.keyboardShortcutRegistry.setProviderSupportedShortcuts).toHaveBeenCalledWith(['ctrl+a'])
  })

  test('passes keyboardShortcutRegistry through to the rendered App', async () => {
    await initApp()

    const rendered = createRoot.mock.results[0].value.render.mock.calls[0][0]
    expect(rendered.props.keyboardShortcutRegistry).toBe(mockRegistries.keyboardShortcutRegistry)
  })
})
