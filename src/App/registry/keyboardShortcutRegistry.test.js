// src/core/registry/keyboardShortcutRegistry.test.js
describe('createKeyboardShortcutRegistry', () => {
  let createKeyboardShortcutRegistry
  let coreShortcutsMock

  beforeEach(() => {
    jest.resetModules()
    // Mock coreShortcuts import for isolation
    coreShortcutsMock = [
      { id: 'copy', description: 'Copy' },
      { id: 'paste', description: 'Paste' }
    ]
    jest.doMock('../controls/keyboardShortcuts.js', () => ({
      coreShortcuts: coreShortcutsMock
    }))

    createKeyboardShortcutRegistry = require('./keyboardShortcutRegistry.js').createKeyboardShortcutRegistry
  })

  test('registerKeyboardShortcut should add a plugin shortcut', () => {
    const registry = createKeyboardShortcutRegistry()
    const shortcut = { id: 'pluginShortcut', description: 'Plugin Shortcut' }
    registry.registerKeyboardShortcut({ shortcut })
    expect(registry.getKeyboardShortcuts()).toContain(shortcut)
  })

  test('registerKeyboardShortcut updates an existing shortcut when re-registered with the same id', () => {
    const registry = createKeyboardShortcutRegistry()
    const shortcut = { id: 'duplicate', description: 'First' }
    const updatedShortcut = { id: 'duplicate', description: 'Second' }
    registry.registerKeyboardShortcut({ shortcut })
    registry.registerKeyboardShortcut({ shortcut: updatedShortcut })
    const shortcuts = registry.getKeyboardShortcuts()
    expect(shortcuts).toContain(updatedShortcut)
    expect(shortcuts).not.toContain(shortcut)
    expect(shortcuts.filter(s => s.id === 'duplicate')).toHaveLength(1)
  })

  test('setProviderSupportedShortcuts should filter core shortcuts', () => {
    const registry = createKeyboardShortcutRegistry()
    registry.setProviderSupportedShortcuts(['copy'])
    expect(registry.getKeyboardShortcuts()).toEqual([{ id: 'copy', description: 'Copy' }])
  })

  test('setProviderSupportedShortcuts with no argument defaults to empty set', () => {
    const registry = createKeyboardShortcutRegistry()
    registry.setProviderSupportedShortcuts() // no ids argument
    expect(registry.getKeyboardShortcuts()).toEqual([]) // default empty
  })

  test('getKeyboardShortcuts should merge core and plugin shortcuts', () => {
    const registry = createKeyboardShortcutRegistry()
    registry.setProviderSupportedShortcuts(['copy'])
    const pluginShortcut = { id: 'plugin', description: 'Plugin' }
    registry.registerKeyboardShortcut({ shortcut: pluginShortcut })
    expect(registry.getKeyboardShortcuts()).toEqual([
      { id: 'copy', description: 'Copy' },
      pluginShortcut
    ])
  })

  test('setProviderSupportedShortcuts with empty array returns no core shortcuts', () => {
    const registry = createKeyboardShortcutRegistry()
    registry.setProviderSupportedShortcuts([])
    expect(registry.getKeyboardShortcuts()).toEqual([])
  })

  test('getKeyboardShortcuts filters by requiredConfig when appConfig provided', () => {
    jest.resetModules()
    jest.doMock('../controls/keyboardShortcuts.js', () => ({
      coreShortcuts: [
        { id: 'always', description: 'Always shown' },
        { id: 'conditional', description: 'Conditional', requiredConfig: ['featureEnabled'] }
      ]
    }))
    const registry = require('./keyboardShortcutRegistry.js').createKeyboardShortcutRegistry()
    registry.setProviderSupportedShortcuts(['always', 'conditional'])

    // Without config, conditional shortcut is excluded
    expect(registry.getKeyboardShortcuts()).toEqual([
      { id: 'always', description: 'Always shown' }
    ])

    // With config false, conditional shortcut is excluded
    expect(registry.getKeyboardShortcuts({ featureEnabled: false })).toEqual([
      { id: 'always', description: 'Always shown' }
    ])

    // With config true, conditional shortcut is included
    expect(registry.getKeyboardShortcuts({ featureEnabled: true })).toEqual([
      { id: 'always', description: 'Always shown' },
      { id: 'conditional', description: 'Conditional', requiredConfig: ['featureEnabled'] }
    ])
  })

  test('two registry instances are fully isolated from each other', () => {
    // This is the multi-map-on-a-page scenario: a shortcut registered by one map
    // (e.g. a plugin) must never leak into another map's help panel, and each map's
    // provider-supported-shortcuts filtering must stay independent.
    const registryA = createKeyboardShortcutRegistry()
    const registryB = createKeyboardShortcutRegistry()

    registryA.setProviderSupportedShortcuts(['copy'])
    registryA.registerKeyboardShortcut({ shortcut: { id: 'onlyOnA', description: 'Only on A' } })

    registryB.setProviderSupportedShortcuts(['paste'])

    expect(registryA.getKeyboardShortcuts()).toEqual([
      { id: 'copy', description: 'Copy' },
      { id: 'onlyOnA', description: 'Only on A' }
    ])
    expect(registryB.getKeyboardShortcuts()).toEqual([
      { id: 'paste', description: 'Paste' }
    ])
  })
})
