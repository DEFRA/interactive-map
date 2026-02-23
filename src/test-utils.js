// Test helper for creating mock registry instances
export const createMockRegistries = (overrides = {}) => {
  const defaults = {
    buttonConfig: {},
    panelConfig: {},
    controlConfig: {}
  }

  const configs = { ...defaults, ...overrides }

  return {
    buttonRegistry: {
      getButtonConfig: jest.fn(() => configs.buttonConfig),
      addButton: jest.fn(),
      registerButton: jest.fn(),
      clear: jest.fn()
    },
    panelRegistry: {
      getPanelConfig: jest.fn(() => configs.panelConfig),
      addPanel: jest.fn(),
      registerPanel: jest.fn(),
      removePanel: jest.fn(),
      clear: jest.fn()
    },
    controlRegistry: {
      getControlConfig: jest.fn(() => configs.controlConfig),
      addControl: jest.fn(),
      registerControl: jest.fn(),
      clear: jest.fn()
    },
    pluginRegistry: {
      registeredPlugins: [],
      registerPlugin: jest.fn(),
      clear: jest.fn()
    }
  }
}

// Helper to create mock appState with registries
export const createMockAppState = (overrides = {}) => {
  const registries = createMockRegistries(overrides)

  return {
    breakpoint: 'desktop',
    mode: 'view',
    openPanels: {},
    dispatch: jest.fn(),
    disabledButtons: new Set(),
    hiddenButtons: new Set(),
    pressedButtons: new Set(),
    expandedButtons: new Set(),
    buttonConfig: registries.buttonRegistry.getButtonConfig(),
    panelConfig: registries.panelRegistry.getPanelConfig(),
    controlConfig: registries.controlRegistry.getControlConfig(),
    pluginRegistry: registries.pluginRegistry,
    ...registries,
    ...overrides
  }
}
