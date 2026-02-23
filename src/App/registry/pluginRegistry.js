// src/core/registry/pluginRegistry.js
import { registerIcon } from './iconRegistry.js'
import { registerKeyboardShortcut } from './keyboardShortcutRegistry.js'

const asArray = (value) => Array.isArray(value) ? value : [value]

export function createPluginRegistry ({ registerButton, registerPanel, registerControl }) {
  const registeredPlugins = []

  function registerPlugin (plugin) {
    const { manifest } = plugin

    const pluginConfig = {
      pluginId: plugin.id,
      includeModes: plugin.config?.includeModes,
      excludeModes: plugin.config?.excludeModes
    }

    if (manifest.buttons) {
      asArray(manifest.buttons).forEach(button => {
        registerButton({ [button.id]: { ...pluginConfig, ...button } })
        // Flat button registry including any menu items (isMenuItem prevents slot rendering)
        button?.menuItems?.forEach(menuItem => {
          registerButton({ [menuItem.id]: { ...pluginConfig, ...menuItem, isMenuItem: true } })
        })
      })
    }

    if (manifest.panels) {
      asArray(manifest.panels).forEach(panel => {
        registerPanel({ [panel.id]: { ...pluginConfig, ...panel } })
      })
    }

    if (manifest.controls) {
      asArray(manifest.controls).forEach(control => {
        registerControl({ [control.id]: { ...pluginConfig, ...control } })
      })
    }

    if (manifest.icons) {
      asArray(manifest.icons).forEach(icon =>
        registerIcon({ [icon.id]: icon.svgContent })
      )
    }

    if (manifest.keyboardShortcuts) {
      asArray(manifest.keyboardShortcuts).forEach(shortcut =>
        registerKeyboardShortcut({ ...pluginConfig, shortcut })
      )
    }

    registeredPlugins.push(plugin)
  }

  function clear () {
    registeredPlugins.length = 0
  }

  return {
    registeredPlugins,
    registerPlugin,
    clear
  }
}
