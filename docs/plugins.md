# Plugins

Plugins extend the InteractiveMap with additional functionality. This page lists the available plugins and links to their documentation.

For guidance on building your own plugins, see [Building a Plugin](./building-a-plugin.md).

## Available Plugins

The following plugins are available for use with InteractiveMap.

### [Interact](./plugins/interact.md)

Select features or place markers on the map.

### [Map Styles](./plugins/map-styles.md)

Map style switching plugin that adds a UI control for changing the basemap appearance and the map size (provider depending).

### [Scale Bar](./plugins/scale-bar.md)

Scale bar display plugin that shows the current map scale.

### [Search](./plugins/search.md)

Location search plugin with autocomplete functionality. Include custom datasets to search.

## Alpha Plugins

The following plugins are in early development. APIs and features may change.

### Datasets

Add datasets to your map, configure the display, layer toggling and render a key of symbology.

### Draw for MapLibre

Draw lines and polygons using the MapLibre map provider.

### Draw for ESRI SDK

Draw polygons using the Esri map provider.

### Frame

Add a regular shaped frame to the map and control its position. Use to generate reports or draw features.

### Use Location

Geolocation plugin that allows users to centre the map on their current location.

## Coming Soon

The following plugins are planned for future releases.

### Geometry Actions

Split and merge polygons.

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
