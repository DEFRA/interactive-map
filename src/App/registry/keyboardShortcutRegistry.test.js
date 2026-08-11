// src/core/registry/keyboardShortcutRegistry.test.js
describe('keyboardShortcutRegistry', () => {
  let registerKeyboardShortcut
  let setProviderSupportedShortcuts
  let getKeyboardShortcuts
  let createKeyboardShortcutRegistry
  let coreShortcutsMock

  const emptyState = () => ({
    pluginShortcutHelp: [],
    pluginShortcutIds: new Set(),
    providerSupportedIds: new Set()
  })

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
    createKeyboardShortcutRegistry = module.createKeyboardShortcutRegistry
  })

  test('registerKeyboardShortcut should add a plugin shortcut', () => {
    const state = emptyState()
    const shortcut = { id: 'pluginShortcut', description: 'Plugin Shortcut' }
    registerKeyboardShortcut(state, { shortcut })
    const shortcuts = getKeyboardShortcuts(state)
    expect(shortcuts).toContain(shortcut)
  })

  test('registerKeyboardShortcut updates an existing shortcut when re-registered with the same id', () => {
    const state = emptyState()
    const shortcut = { id: 'duplicate', description: 'First' }
    const updatedShortcut = { id: 'duplicate', description: 'Second' }
    registerKeyboardShortcut(state, { shortcut })
    registerKeyboardShortcut(state, { shortcut: updatedShortcut })
    const shortcuts = getKeyboardShortcuts(state)
    expect(shortcuts).toContain(updatedShortcut)
    expect(shortcuts).not.toContain(shortcut)
    expect(shortcuts.filter(s => s.id === 'duplicate')).toHaveLength(1)
  })

  test('setProviderSupportedShortcuts should filter core shortcuts', () => {
    const state = emptyState()
    setProviderSupportedShortcuts(state, ['copy'])
    const shortcuts = getKeyboardShortcuts(state)
    expect(shortcuts).toEqual([{ id: 'copy', description: 'Copy' }])
  })

  test('setProviderSupportedShortcuts with no argument defaults to empty set', () => {
    const state = emptyState()
    setProviderSupportedShortcuts(state) // no ids argument
    const shortcuts = getKeyboardShortcuts(state)
    expect(shortcuts).toEqual([]) // default empty
  })

  test('getKeyboardShortcuts should merge core and plugin shortcuts', () => {
    const state = emptyState()
    setProviderSupportedShortcuts(state, ['copy'])
    const pluginShortcut = { id: 'plugin', description: 'Plugin' }
    registerKeyboardShortcut(state, { shortcut: pluginShortcut })
    const shortcuts = getKeyboardShortcuts(state)
    expect(shortcuts).toEqual([
      { id: 'copy', description: 'Copy' },
      pluginShortcut
    ])
  })

  test('setProviderSupportedShortcuts with empty array returns no core shortcuts', () => {
    const state = emptyState()
    setProviderSupportedShortcuts(state, [])
    const shortcuts = getKeyboardShortcuts(state)
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
    const state = emptyState()
    module.setProviderSupportedShortcuts(state, ['always', 'conditional'])

    // Without config, conditional shortcut is excluded
    expect(module.getKeyboardShortcuts(state)).toEqual([
      { id: 'always', description: 'Always shown' }
    ])

    // With config false, conditional shortcut is excluded
    expect(module.getKeyboardShortcuts(state, { featureEnabled: false })).toEqual([
      { id: 'always', description: 'Always shown' }
    ])

    // With config true, conditional shortcut is included
    expect(module.getKeyboardShortcuts(state, { featureEnabled: true })).toEqual([
      { id: 'always', description: 'Always shown' },
      { id: 'conditional', description: 'Conditional', requiredConfig: ['featureEnabled'] }
    ])
  })

  describe('createKeyboardShortcutRegistry', () => {
    test('registers and lists a plugin shortcut through the factory API', () => {
      const registry = createKeyboardShortcutRegistry()
      registry.setProviderSupportedShortcuts(['copy'])
      const shortcut = { id: 'pluginShortcut', description: 'Plugin Shortcut' }
      registry.registerKeyboardShortcut({ shortcut })

      expect(registry.getKeyboardShortcuts()).toEqual([
        { id: 'copy', description: 'Copy' },
        shortcut
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
})
