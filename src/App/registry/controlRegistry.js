// src/registry/createControlRegistry.js
import { defaultControlConfig } from '../../config/appConfig.js'
import { deepMerge } from '../../utils/deepMerge.js'

// Pure utility functions for control registry operations
export const registerControl = (currentConfig, control) => {
  return { ...currentConfig, ...control }
}

export const addControl = (currentConfig, id, config) => {
  const mergedConfig = deepMerge(defaultControlConfig, config)
  return {
    ...currentConfig,
    [id]: { id, ...mergedConfig }
  }
}

export const getControlConfig = (controlConfig) => controlConfig

// Factory function for backward compatibility during migration
export function createControlRegistry () {
  let controlConfig = {}

  return {
    registerControl: (control) => {
      controlConfig = registerControl(controlConfig, control)
    },
    addControl: (id, config) => {
      controlConfig = addControl(controlConfig, id, config)
      return controlConfig[id]
    },
    getControlConfig: () => {
      return getControlConfig(controlConfig)
    },
    clear: () => {
      controlConfig = {}
    }
  }
}
