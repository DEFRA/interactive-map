// src/core/registry/keyboardShortcutRegistry.test.js
describe('keyboardShortcutRegistry', () => {
  let registerKeyboardShortcut
  let setProviderSupportedShortcuts
  let getKeyboardShortcuts
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

    const module = require('./keyboardShortcutRegistry.js')
    registerKeyboardShortcut = module.registerKeyboardShortcut
    setProviderSupportedShortcuts = module.setProviderSupportedShortcuts
    getKeyboardShortcuts = module.getKeyboardShortcuts
  })

  test('registerKeyboardShortcut should add a plugin shortcut', () => {
    const shortcut = { id: 'pluginShortcut', description: 'Plugin Shortcut' }
    registerKeyboardShortcut({ shortcut }) // Pass { shortcut }
    const shortcuts = getKeyboardShortcuts()
    expect(shortcuts).toContain(shortcut)
  })

  test('registerKeyboardShortcut should ignore duplicate plugin shortcuts', () => {
    const shortcut = { id: 'duplicate', description: 'First' }
    const duplicateShortcut = { id: 'duplicate', description: 'Second' }
    // Register the first one
    registerKeyboardShortcut({ shortcut })
    // Try to register a second shortcut with the same ID
    registerKeyboardShortcut({ shortcut: duplicateShortcut })
    const shortcuts = getKeyboardShortcuts()
    // Only the first shortcut should exist
    expect(shortcuts).toContain(shortcut)
    expect(shortcuts).not.toContain(duplicateShortcut)
  })

  test('setProviderSupportedShortcuts should filter core shortcuts', () => {
    setProviderSupportedShortcuts(['copy'])
    const shortcuts = getKeyboardShortcuts()
    expect(shortcuts).toEqual([{ id: 'copy', description: 'Copy' }])
  })

  test('setProviderSupportedShortcuts with no argument defaults to empty set', () => {
    setProviderSupportedShortcuts() // no arguments
    const shortcuts = getKeyboardShortcuts()
    expect(shortcuts).toEqual([]) // default empty
  })

  test('getKeyboardShortcuts should merge core and plugin shortcuts', () => {
    setProviderSupportedShortcuts(['copy'])
    const pluginShortcut = { id: 'plugin', description: 'Plugin' }
    registerKeyboardShortcut({ shortcut: pluginShortcut })
    const shortcuts = getKeyboardShortcuts()
    expect(shortcuts).toEqual([
      { id: 'copy', description: 'Copy' },
      pluginShortcut
    ])
  })

  test('setProviderSupportedShortcuts with empty array returns no core shortcuts', () => {
    setProviderSupportedShortcuts([])
    const shortcuts = getKeyboardShortcuts()
    expect(shortcuts).toEqual([])
  })

  test('getKeyboardShortcuts filters by requiredConfig when appConfig provided', () => {
    jest.resetModules()
    jest.doMock('../controls/keyboardShortcuts.js', () => ({
      coreShortcuts: [
        { id: 'always', description: 'Always shown' },
        { id: 'conditional', description: 'Conditional', requiredConfig: ['featureEnabled'] }
      ]
    }))
    const module = require('./keyboardShortcutRegistry.js')
    module.setProviderSupportedShortcuts(['always', 'conditional'])

    // Without config, conditional shortcut is excluded
    expect(module.getKeyboardShortcuts()).toEqual([
      { id: 'always', description: 'Always shown' }
    ])

    // With config false, conditional shortcut is excluded
    expect(module.getKeyboardShortcuts({ featureEnabled: false })).toEqual([
      { id: 'always', description: 'Always shown' }
    ])

    // With config true, conditional shortcut is included
    expect(module.getKeyboardShortcuts({ featureEnabled: true })).toEqual([
      { id: 'always', description: 'Always shown' },
      { id: 'conditional', description: 'Conditional', requiredConfig: ['featureEnabled'] }
    ])
  })
})
