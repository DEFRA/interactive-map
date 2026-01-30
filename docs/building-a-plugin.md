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

A plugin consists of two parts:

1. **Factory function** - Exports a function that accepts configuration and returns a [PluginDescriptor](./plugins/plugin-descriptor.md)
2. **Manifest** - Defines the plugin's buttons, panels, controls, and other elements

```js
// scale-bar/index.js
export default function createPlugin ({ units = 'metric' } = {}) {
  return {
    id: 'scaleBar',
    units,
    load: async () => {
      const { manifest } = await import('./manifest.js')
      return manifest
    }
  }
}
```

The factory pattern allows configuration to be passed when registering the plugin. All properties (except `id` and `load`) are available as [pluginConfig](./plugins/plugin-context.md#pluginconfig) within the plugin.

```js
import createScaleBarPlugin from '@defra/interactive-map-plugin-scale-bar'

const interactiveMap = new InteractiveMap({
  // ... other options
  plugins: [
    createScaleBarPlugin({ units: 'imperial' })
  ]
})
```

When the map initialises, it calls each plugin's `load` function and registers the manifest's buttons, panels, controls, and other elements.

## Plugin Context

Plugin components and callbacks receive a [PluginContext](./plugins/plugin-context.md) object providing access to:

- **appConfig** - Application configuration
- **appState** - Current app state (breakpoint, interface type, etc.)
- **mapState** - Current map state (zoom, center, bounds)
- **mapProvider** - Methods to interact with the map
- **pluginConfig** - Configuration passed to the factory function
- **pluginState** - Plugin-specific state from your reducer
- **services** - Core services (announcements, reverse geocoding, event bus)

## Quick Example

The scale-bar plugin displays the current map scale. It accepts a `units` option to configure the display format.

```js
// scale-bar/index.js
export default function createPlugin ({ units = 'metric' } = {}) {
  return {
    id: 'scaleBar',
    units,
    load: async () => {
      const { manifest } = await import('./manifest.js')
      return manifest
    }
  }
}
```

```js
// scale-bar/manifest.js
import { ScaleBar } from './ScaleBar.jsx'

export const manifest = {
  controls: [{
    id: 'scaleBar',
    label: 'Scale bar',
    mobile: { slot: 'footer-right' },
    tablet: { slot: 'footer-right' },
    desktop: { slot: 'footer-right' },
    render: ScaleBar
  }]
}
```

```jsx
// scale-bar/ScaleBar.jsx
export function ScaleBar ({ mapState, pluginConfig }) {
  const { resolution } = mapState
  const { units } = pluginConfig

  // Calculate scale based on resolution and units
  const scale = calculateScale(resolution, units)

  return (
    <div className="scale-bar">
      {scale.label}
    </div>
  )
}
```

```js
// Usage
import createScaleBarPlugin from '@defra/interactive-map-plugin-scale-bar'

const interactiveMap = new InteractiveMap({
  plugins: [
    createScaleBarPlugin({ units: 'imperial' })
  ]
})
```

## Reference Documentation

For detailed specifications, see:

- [PluginDescriptor](./plugins/plugin-descriptor.md) - How to register a plugin
- [PluginManifest](./plugins/plugin-manifest.md) - What a plugin can contain
- [PluginContext](./plugins/plugin-context.md) - Context available to plugin code
- [ButtonDefinition](./api/button-definition.md) - Button configuration
- [PanelDefinition](./api/panel-definition.md) - Panel configuration
- [ControlDefinition](./api/control-definition.md) - Custom control configuration
- [IconDefinition](./api/icon-definition.md) - Icon registration
- [Slots](./api/slots.md) - UI slot system for positioning elements

## Events

Plugins can subscribe to application and map events via the `eventBus` service. See the [Events](./api.md#events) section in the API reference for available events.

```js
const { eventBus, events } = context.services

eventBus.on(events.APP_PANEL_OPENED, ({ panelId }) => {
  console.log('Panel opened:', panelId)
})
```
