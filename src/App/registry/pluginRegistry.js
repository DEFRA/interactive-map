// src/core/registry/pluginRegistry.js
import { registerIcon } from './iconRegistry.js'
import { registerKeyboardShortcut } from './keyboardShortcutRegistry.js'
import { allowedSlots } from '../renderer/slots.js'
import { logger } from '../../services/logger.js'

const asArray = (value) => Array.isArray(value) ? value : [value]

const BREAKPOINTS = ['mobile', 'tablet', 'desktop']

function validateSlots (item, type) {
  const allowed = allowedSlots[type]
  BREAKPOINTS.forEach(bp => {
    const slot = item[bp]?.slot
    if (slot && !allowed.includes(slot) && !(type === 'panel' && slot.endsWith('-button'))) {
      logger.warn(`${type} "${item.id}" has invalid slot "${slot}" at breakpoint "${bp}". Allowed slots: ${allowed.join(', ')}.`)
    }
  })
}

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
        validateSlots(button, 'button')
        registerButton({ [button.id]: { ...pluginConfig, ...button } })
        // Flat button registry including any menu items (isMenuItem prevents slot rendering)
        button?.menuItems?.forEach(menuItem => {
          registerButton({ [menuItem.id]: { ...pluginConfig, ...menuItem, isMenuItem: true } })
        })
      })
    }

    if (manifest.panels) {
      asArray(manifest.panels).forEach(panel => {
        validateSlots(panel, 'panel')
        registerPanel({ [panel.id]: { ...pluginConfig, ...panel } })
      })
    }

    if (manifest.controls) {
      asArray(manifest.controls).forEach(control => {
        validateSlots(control, 'control')
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
