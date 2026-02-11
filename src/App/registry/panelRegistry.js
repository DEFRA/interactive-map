// src/registry/createPanelRegistry.js
import { defaultPanelConfig } from '../../config/appConfig.js'
import { deepMerge } from '../../utils/deepMerge.js'

// Pure utility functions for panel registry operations
export const registerPanel = (currentConfig, panel) => {
  const normalizedPanelConfig = Object.fromEntries(
    Object.entries(panel).map(([key, value]) => [
      key,
      {
        showLabel: true,
        ...value
      }
    ])
  )
  return { ...currentConfig, ...normalizedPanelConfig }
}

export const addPanel = (currentConfig, id, config) => {
  const mergedConfig = deepMerge(defaultPanelConfig, config)

  return {
    ...currentConfig,
    [id]: {
      ...mergedConfig,
      html: mergedConfig.html,
      render: mergedConfig.render
    }
  }
}

export const removePanel = (currentConfig, id) => {
  const { [id]: _, ...rest } = currentConfig // NOSONAR - _ is required to destructure out the key
  return rest
}

export const getPanelConfig = (panelConfig) => panelConfig

// Factory function for backward compatibility during migration
export function createPanelRegistry () {
  let panelConfig = {}

  return {
    registerPanel: (panel) => {
      panelConfig = registerPanel(panelConfig, panel)
    },
    addPanel: (id, config) => {
      panelConfig = addPanel(panelConfig, id, config)
      return panelConfig[id]
    },
    removePanel: (id) => {
      panelConfig = removePanel(panelConfig, id)
    },
    getPanelConfig: () => {
      return getPanelConfig(panelConfig)
    },
    clear: () => {
      panelConfig = {}
    }
  }
}
