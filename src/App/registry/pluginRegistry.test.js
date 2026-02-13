import { createPluginRegistry } from './pluginRegistry.js'

// Mock all dependent registries
jest.mock('./buttonRegistry.js', () => ({ registerButton: jest.fn() }))
jest.mock('./panelRegistry.js', () => ({ registerPanel: jest.fn() }))
jest.mock('./controlRegistry.js', () => ({ registerControl: jest.fn() }))
jest.mock('./iconRegistry.js', () => ({ registerIcon: jest.fn() }))
jest.mock('./keyboardShortcutRegistry.js', () => ({ registerKeyboardShortcut: jest.fn() }))

describe('pluginRegistry', () => {
  let pluginRegistry
  let registerButton, registerPanel, registerControl, registerIcon, registerKeyboardShortcut

  beforeEach(() => {
    jest.clearAllMocks()

    registerButton = require('./buttonRegistry.js').registerButton
    registerPanel = require('./panelRegistry.js').registerPanel
    registerControl = require('./controlRegistry.js').registerControl
    registerIcon = require('./iconRegistry.js').registerIcon
    registerKeyboardShortcut = require('./keyboardShortcutRegistry.js').registerKeyboardShortcut

    pluginRegistry = createPluginRegistry({ registerButton, registerPanel, registerControl })
  })

  it('registers plugin and pushes to registeredPlugins', () => {
    const plugin = {
      id: 'plugin1',
      config: { includeModes: ['view'], excludeModes: ['edit'] },
      manifest: {}
    }
    pluginRegistry.registerPlugin(plugin)
    expect(pluginRegistry.registeredPlugins).toContain(plugin)
  })

  it('registers buttons, panels, controls, icons, and shortcuts with pluginConfig info', () => {
    const plugin = {
      id: 'plugin2',
      config: { includeModes: ['view'], excludeModes: ['edit'] },
      manifest: {
        buttons: { id: 'btn1' },
        panels: [{ id: 'panel1' }],
        controls: { id: 'ctrl1' },
        icons: { id: 'icon1', svgContent: 'Comp' }, // match implementation
        keyboardShortcuts: { key: 'K' }
      }
    }

    pluginRegistry.registerPlugin(plugin)

    const expectedPluginConfig = {
      pluginId: 'plugin2',
      includeModes: ['view'],
      excludeModes: ['edit']
    }

    expect(registerButton).toHaveBeenCalledWith({
      btn1: expect.objectContaining(expectedPluginConfig)
    })
    expect(registerPanel).toHaveBeenCalledWith({
      panel1: expect.objectContaining(expectedPluginConfig)
    })
    expect(registerControl).toHaveBeenCalledWith({
      ctrl1: expect.objectContaining(expectedPluginConfig)
    })
    expect(registerIcon).toHaveBeenCalledWith({ icon1: 'Comp' })
    expect(registerKeyboardShortcut).toHaveBeenCalledWith(
      expect.objectContaining({
        ...expectedPluginConfig,
        shortcut: { key: 'K' }
      })
    )

    expect(pluginRegistry.registeredPlugins).toContain(plugin)
  })

  it('handles single vs array manifests correctly', () => {
    const plugin = {
      id: 'plugin3',
      config: { includeModes: ['a'], excludeModes: ['b'] },
      manifest: {
        buttons: [{ id: 'b1' }, { id: 'b2' }],
        panels: { id: 'p1' },
        controls: [{ id: 'c1' }],
        icons: [{ id: 'i1', svgContent: 'Comp' }],
        keyboardShortcuts: [{ key: 'S' }]
      }
    }

    pluginRegistry.registerPlugin(plugin)

    expect(registerButton).toHaveBeenCalledTimes(2)
    expect(registerPanel).toHaveBeenCalledTimes(1)
    expect(registerControl).toHaveBeenCalledTimes(1)
    expect(registerIcon).toHaveBeenCalledTimes(1)
    expect(registerKeyboardShortcut).toHaveBeenCalledTimes(1)
  })

  it('registers multiple plugins independently', () => {
    const pluginA = { id: 'A', config: {}, manifest: {} }
    const pluginB = { id: 'B', config: {}, manifest: {} }
    pluginRegistry.registerPlugin(pluginA)
    pluginRegistry.registerPlugin(pluginB)
    expect(pluginRegistry.registeredPlugins).toEqual([pluginA, pluginB])
  })

  it('clears all registered plugins', () => {
    const pluginA = { id: 'A', config: {}, manifest: {} }
    const pluginB = { id: 'B', config: {}, manifest: {} }

    // Fill the registry
    pluginRegistry.registerPlugin(pluginA)
    pluginRegistry.registerPlugin(pluginB)
    expect(pluginRegistry.registeredPlugins.length).toBe(2)

    // Execute clear
    pluginRegistry.clear()

    // Verify it is empty
    expect(pluginRegistry.registeredPlugins.length).toBe(0)
    expect(pluginRegistry.registeredPlugins).toEqual([])
  })
})
