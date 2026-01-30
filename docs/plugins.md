# Plugins

Plugins extend the InteractiveMap with additional functionality. This page lists the available plugins and links to their documentation.

For guidance on building your own plugins, see [Building a Plugin](./building-a-plugin.md).

## Available Plugins

The following plugins are available for use with InteractiveMap:

### datasets

Dataset loading and management plugin.

### draw-es

Drawing and sketching tools for Esri map providers.

### draw-ml

Drawing and sketching tools for MapLibre map providers.

### frame

Frame selection plugin for defining areas of interest.

### interact

Feature interaction plugin for handling map element selection and hover states.

### map-styles

Map style switching plugin that adds a UI control for changing the basemap appearance.

### scale-bar

Scale bar display plugin that shows the current map scale.

### search

Location search plugin with autocomplete functionality.

### use-location

Geolocation plugin that allows users to centre the map on their current location.

## Using Plugins

Plugins are registered via the `plugins` option when creating an InteractiveMap. Plugins typically export a factory function that accepts configuration options:

```js
import createHighlightPlugin from '@example/highlight-plugin'

const highlightPlugin = createHighlightPlugin({
  color: '#ff0000',
  opacity: 0.5
})

const interactiveMap = new InteractiveMap({
  // ... other options
  plugins: [highlightPlugin]
})
```

The factory function returns a [PluginDescriptor](./plugins/plugin-descriptor.md) with:

- **id** - Unique identifier for the plugin instance
- **load** - Function that returns a [PluginManifest](./plugins/plugin-manifest.md)
- **...options** - Configuration passed to the factory, available as [pluginConfig](./plugins/plugin-context.md#pluginconfig)

## Plugin Events

Plugins can emit events that you can listen to using `interactiveMap.on()`:

```js
interactiveMap.on('highlight:added', ({ id, coords }) => {
  console.log('Highlight added:', id)
})

interactiveMap.on('highlight:removed', ({ id }) => {
  console.log('Highlight removed:', id)
})
```

## Plugin Methods

Plugins can expose methods that you call on the plugin instance:

```js
// After map:ready, call methods on the plugin instance
interactiveMap.on('map:ready', () => {
  highlightPlugin.add('area-1', [[0, 0], [1, 0], [1, 1], [0, 1]])
  highlightPlugin.remove('area-1')
})
```

See individual plugin documentation for available events and methods.

## Further Reading

- [Building a Plugin](./building-a-plugin.md) - Guide to creating custom plugins
- [PluginDescriptor](./plugins/plugin-descriptor.md) - Plugin registration reference
- [PluginManifest](./plugins/plugin-manifest.md) - Plugin manifest reference
- [PluginContext](./plugins/plugin-context.md) - Context available to plugin code
