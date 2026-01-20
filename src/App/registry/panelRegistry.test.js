import { registerPanel, addPanel, removePanel, getPanelConfig } from './panelRegistry.js'
import { defaultPanelConfig } from '../../config/appConfig.js'

describe('panelRegistry', () => {
  test('registerPanel should store a panel with showLabel default', () => {
    const panel = { settings: { title: 'Settings Panel' } }
    const config = registerPanel({}, panel)
    expect(config).toEqual({
      settings: {
        title: 'Settings Panel',
        showLabel: true
      }
    })
  })

  test('registerPanel should merge multiple panels', () => {
    const panel1 = { settings: { title: 'Settings Panel' } }
    const panel2 = { dashboard: { title: 'Dashboard Panel', showLabel: false } }
    let config = {}
    config = registerPanel(config, panel1)
    config = registerPanel(config, panel2)
    expect(config).toEqual({
      settings: {
        title: 'Settings Panel',
        showLabel: true
      },
      dashboard: {
        title: 'Dashboard Panel',
        showLabel: false
      }
    })
  })

  test('getPanelConfig should return the current panel config', () => {
    const panel = { reports: { title: 'Reports Panel' } }
    const config = registerPanel({}, panel)
    const result = getPanelConfig(config)
    expect(result).toEqual({
      reports: {
        title: 'Reports Panel',
        showLabel: true
      }
    })
  })

  // --- New tests for addPanel / removePanel ---

  test('addPanel adds a panel using deepMerge', () => {
    const id = 'analytics'
    const config = { title: 'Analytics Panel', html: '<div></div>' }
    const currentConfig = {}
    const updatedConfig = addPanel(currentConfig, id, config)

    expect(updatedConfig[id]).toEqual({
      ...defaultPanelConfig,
      ...config,
      html: config.html,
      render: null // match defaultPanelConfig
    })
    expect(updatedConfig).not.toBe(currentConfig) // Immutable
  })

  test('addPanel can add multiple panels', () => {
    let config = {}
    config = addPanel(config, 'panel1', { title: 'Panel 1' })
    config = addPanel(config, 'panel2', { title: 'Panel 2', render: () => {} })

    const keys = Object.keys(config)
    expect(keys).toEqual(['panel1', 'panel2'])
    expect(config.panel1.title).toBe('Panel 1')
    expect(typeof config.panel2.render).toBe('function')
  })

  test('removePanel removes a panel by id', () => {
    let config = {}
    config = addPanel(config, 'tempPanel', { title: 'Temp' })
    expect(config.tempPanel).toBeDefined()

    config = removePanel(config, 'tempPanel')
    expect(config.tempPanel).toBeUndefined()
  })

  test('removePanel returns immutable config', () => {
    const config = { panel1: { title: 'A' }, panel2: { title: 'B' } }
    const updatedConfig = removePanel(config, 'panel1')

    expect(updatedConfig.panel2).toBeDefined()
    expect(updatedConfig.panel1).toBeUndefined()
    expect(updatedConfig).not.toBe(config) // Immutable
  })
})
