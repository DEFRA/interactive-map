// src/registry/createButtonRegistry.js
import { defaultButtonConfig } from '../../config/appConfig.js'
import { deepMerge } from '../../utils/deepMerge.js'

// Pure utility functions for button registry operations
export const registerButton = (currentConfig, button) => {
  return { ...currentConfig, ...button }
}

export const addButton = (currentConfig, id, config) => {
  const mergedConfig = deepMerge(defaultButtonConfig, config)
  return {
    ...currentConfig,
    [id]: mergedConfig
  }
}

export const getButtonConfig = (buttonConfig, pluginId) => {
  if (pluginId) {
    return Object.fromEntries(
      Object.entries(buttonConfig).filter(
        ([_, btn]) => btn.pluginId === pluginId
      )
    )
  }
  return buttonConfig
}

// Factory function for backward compatibility during migration
export function createButtonRegistry () {
  let buttonConfig = {}

  return {
    registerButton: (button) => {
      buttonConfig = registerButton(buttonConfig, button)
    },
    addButton: (id, config) => {
      buttonConfig = addButton(buttonConfig, id, config)
      return id
    },
    getButtonConfig: (pluginId) => {
      return getButtonConfig(buttonConfig, pluginId)
    },
    clear: () => {
      buttonConfig = {}
    }
  }
}
