// src/core/registry/pluginRegistry.js
import { registerIcon } from './iconRegistry.js'
import { registerKeyboardShortcut } from './keyboardShortcutRegistry.js'

export function createPluginRegistry ({ registerButton, registerPanel, registerControl }) {
  const registeredPlugins = []

  function registerPlugin (plugin) {
    const { manifest } = plugin

    const pluginConfig = {
      pluginId: plugin.id,
      includeModes: plugin.config?.includeModes,
      excludeModes: plugin.config?.excludeModes
    }

    // --- Register buttons ---
    if (manifest.buttons) {
      const buttons = Array.isArray(manifest.buttons)
        ? manifest.buttons
        : [manifest.buttons]

      buttons.forEach(button => {
        registerButton({
          [button.id]: {
            ...pluginConfig,
            ...button
          }
        })
      })
    }

    // --- Register panels ---
    if (manifest.panels) {
      const panels = Array.isArray(manifest.panels)
        ? manifest.panels
        : [manifest.panels]

      panels.forEach(panel => {
        registerPanel({
          [panel.id]: {
            ...pluginConfig,
            ...panel
          }
        })
      })
    }

    // --- Register controls ---
    if (manifest.controls) {
      const controls = Array.isArray(manifest.controls)
        ? manifest.controls
        : [manifest.controls]

      controls.forEach(control => {
        registerControl({
          [control.id]: {
            ...pluginConfig,
            ...control
          }
        })
      })
    }

    // --- Register icons ---
    if (manifest.icons) {
      const icons = Array.isArray(manifest.icons)
        ? manifest.icons
        : [manifest.icons]

      icons.forEach(icon =>
        registerIcon({ [icon.id]: icon.svgContent })
      )
    }

    // --- Register keyboard shortcuts ---
    if (manifest.keyboardShortcuts) {
      const shortcuts = Array.isArray(manifest.keyboardShortcuts)
        ? manifest.keyboardShortcuts
        : [manifest.keyboardShortcuts]

      shortcuts.forEach(shortcut =>
        registerKeyboardShortcut({
          ...pluginConfig,
          shortcut
        })
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
