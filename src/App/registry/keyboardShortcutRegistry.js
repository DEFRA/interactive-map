// src/core/registry/keyboardShortcutRegistry.js
import { coreShortcuts } from '../controls/keyboardShortcuts.js'

// Stores the actual shortcut objects in insertion order
const pluginShortcutHelp = []

// Tracks only IDs for O(1) duplicate detection
const pluginShortcutIds = new Set()

let providerSupportedIds = new Set()

export const registerKeyboardShortcut = ({ shortcut }) => {
  // Only add if we haven't seen this ID before
  if (!pluginShortcutIds.has(shortcut.id)) {
    pluginShortcutIds.add(shortcut.id)
    pluginShortcutHelp.push(shortcut)
  }
}

export const setProviderSupportedShortcuts = (ids = []) => {
  providerSupportedIds = new Set(ids)
}

export const getKeyboardShortcuts = (appConfig = {}) => {
  const filteredCore = coreShortcuts.filter(s => {
    // Must be supported by provider
    if (!providerSupportedIds.has(s.id)) {
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
    ...pluginShortcutHelp // plugin-defined shortcuts (deduped)
  ]
}
