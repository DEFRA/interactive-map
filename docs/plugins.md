# Building Plugins

Plugins extend the InteractiveMap with custom buttons, panels, controls, and behaviours. This guide introduces the plugin system and links to the detailed reference documentation.

## Overview

A plugin is a module that registers UI elements and logic with the map. Plugins can:

- Add **buttons** to the toolbar with built-in styling and behaviour
- Add **panels** for content like search results or layer controls
- Add **controls** for fully custom UI elements
- Register **icons** for use across the application
- Expose **API methods** callable from outside the plugin
- Manage **state** with a reducer pattern

## How Plugins Work

Plugins are registered via the `plugins` option when creating an InteractiveMap:

```js
const interactiveMap = new InteractiveMap({
  // ... other options
  plugins: [
    {
      id: 'my-plugin',
      load: () => import('./plugins/my-plugin.js')
    }
  ]
})
```

Each plugin provides a [PluginDescriptor](./plugins/plugin-descriptor.md) with an `id` and a `load` function that returns a [PluginManifest](./plugins/plugin-manifest.md).

When the map initialises, it calls each plugin's `load` function and registers the manifest's buttons, panels, controls, and other elements.

## Plugin Context

Plugin components and callbacks receive a [PluginContext](./plugins/plugin-context.md) object providing access to:

- **appConfig** - Application configuration
- **appState** - Current app state (breakpoint, interface type, etc.)
- **mapState** - Current map state (zoom, center, bounds)
- **mapProvider** - Methods to interact with the map
- **pluginConfig** - Plugin-specific configuration
- **pluginState** - Plugin-specific state from your reducer
- **services** - Core services (announcements, reverse geocoding, event bus)

## Quick Example

A simple plugin that adds a button to show an alert:

```js
// my-plugin.js
export default {
  buttons: [
    {
      id: 'my-button',
      label: 'Say Hello',
      iconId: 'info',
      onClick: (event, context) => {
        alert('Hello from my plugin!')
      },
      mobile: { slot: 'top-right' },
      tablet: { slot: 'top-right' },
      desktop: { slot: 'top-right' }
    }
  ]
}
```

## Reference Documentation

For detailed specifications, see:

- [PluginDescriptor](./plugins/plugin-descriptor.md) - How to register a plugin
- [PluginManifest](./plugins/plugin-manifest.md) - What a plugin can contain
- [PluginContext](./plugins/plugin-context.md) - Context available to plugin code
- [ButtonDefinition](./plugins/button-definition.md) - Button configuration
- [PanelDefinition](./plugins/panel-definition.md) - Panel configuration
- [ControlDefinition](./plugins/control-definition.md) - Custom control configuration
- [IconDefinition](./plugins/icon-definition.md) - Icon registration
- [Slots](./plugins/slots.md) - UI slot system for positioning elements

## Events

Plugins can subscribe to application and map events via the `eventBus` service. See the [Events](./api.md#events) section in the API reference for available events.

```js
const { eventBus, events } = context.services

eventBus.on(events.APP_PANEL_OPENED, ({ panelId }) => {
  console.log('Panel opened:', panelId)
})
```
