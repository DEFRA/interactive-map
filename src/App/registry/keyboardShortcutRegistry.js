// src/core/registry/keyboardShortcutRegistry.js
import { coreShortcuts } from '../controls/keyboardShortcuts.js'

// State is passed in explicitly, rather than held at module scope, so each map instance gets its own registry and can't leak shortcuts or provider support into another map's help panel.

export const registerKeyboardShortcut = (state, { shortcut }) => {
  const { pluginShortcutHelp, pluginShortcutIds } = state
  if (pluginShortcutIds.has(shortcut.id)) {
    pluginShortcutHelp[pluginShortcutHelp.findIndex(s => s.id === shortcut.id)] = shortcut
  } else {
    pluginShortcutIds.add(shortcut.id)
    pluginShortcutHelp.push(shortcut)
  }
}

export const setProviderSupportedShortcuts = (state, ids = []) => {
  state.providerSupportedIds = new Set(ids)
}

export const getKeyboardShortcuts = (state, appConfig = {}) => {
  const filteredCore = coreShortcuts.filter(s => {
    // Must be supported by provider
    if (!state.providerSupportedIds.has(s.id)) {
      return false
    }
    // Check requiredConfig - all specified config values must be truthy
    if (s.requiredConfig) {
      return s.requiredConfig.every(key => appConfig[key])
    }
    return true
  })

  return [
    ...filteredCore, // supported core shortcuts
    ...state.pluginShortcutHelp // plugin-defined shortcuts (deduped)
  ]
}

// One instance per map — see initialiseApp.js's getOrCreateRegistries.
export function createKeyboardShortcutRegistry () {
  const state = {
    // Stores the actual shortcut objects in insertion order
    pluginShortcutHelp: [],
    // Tracks only IDs for O(1) duplicate detection
    pluginShortcutIds: new Set(),
    providerSupportedIds: new Set()
  }

  return {
    registerKeyboardShortcut: (args) => registerKeyboardShortcut(state, args),
    setProviderSupportedShortcuts: (ids) => setProviderSupportedShortcuts(state, ids),
    getKeyboardShortcuts: (appConfig) => getKeyboardShortcuts(state, appConfig)
  }
}
