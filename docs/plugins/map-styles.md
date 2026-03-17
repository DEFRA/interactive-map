# Map Styles Plugin

Adds a UI control for switching between basemap styles and, where supported by the map provider, adjusting the map size.

## Usage

```js
import createMapStylesPlugin from '@defra/interactive-map/plugins/map-styles'

const mapStylesPlugin = createMapStylesPlugin({
  mapStyles: [
    {
      id: 'default',
      label: 'Default',
      url: '/styles/default.json',
      thumbnail: '/images/default-thumb.png'
    },
    {
      id: 'satellite',
      label: 'Satellite',
      url: '/styles/satellite.json',
      thumbnail: '/images/satellite-thumb.png'
    }
  ]
})

const interactiveMap = new InteractiveMap({
  plugins: [mapStylesPlugin]
})
```

## Options

Options are passed to the factory function when creating the plugin.

---

### `mapStyles`
**Type:** `MapStyleConfig[]`
**Required**

Array of map style configurations. Each style appears as an option in the style switcher UI.

See [MapStyleConfig](../api/map-style-config.md) for full details.

```js
createMapStylesPlugin({
  mapStyles: [
    {
      id: 'outdoor',
      label: 'Outdoor',
      url: '/styles/outdoor.json',
      appColorScheme: 'light',
      mapColorScheme: 'light',
      backgroundColor: '#f5f5f0',
      thumbnail: '/images/outdoor-thumb.png'
    },
    {
      id: 'dark',
      label: 'Dark',
      url: '/styles/dark.json',
      appColorScheme: 'dark',
      mapColorScheme: 'dark',
      backgroundColor: '#1a1a1a',
      thumbnail: '/images/dark-thumb.png'
    }
  ]
})
```

---

### `includeModes`
**Type:** `string[]`

Array of mode identifiers. When set, the plugin only renders when the app is in one of these modes.

---

### `excludeModes`
**Type:** `string[]`

Array of mode identifiers. When set, the plugin does not render when the app is in one of these modes.

---

## Map size

When the active map provider supports map sizes (i.e. `mapProvider.capabilities.supportsMapSizes` is `true`), the panel also shows a map size control. This lets users choose between three size levels:

| Size | Description |
|------|-------------|
| `small` | Default size |
| `medium` | 1.5× scale |
| `large` | 2× scale |

Increasing the map size scales all features — labels, lines, polygons, and symbols — proportionally larger. If the map provider does not support this capability, the size control is not shown.

---

## Persistence

The selected map style and map size are automatically saved to `localStorage` and restored on the next page load, keyed by the map instance ID. Users' choices therefore persist across sessions without any additional configuration.

---

## Methods

This plugin does not expose any public methods.

---

## Events

---

### `map:setstyle`

Emitted when the user selects a map style.

**Payload:** The full [MapStyleConfig](../api/map-style-config.md) object for the selected style.

```js
interactiveMap.on('map:setstyle', (mapStyle) => {
  console.log('Style changed to:', mapStyle.id)
})
```

---

### `map:setsize`

Emitted when the user selects a map size. Only fired when the map provider supports map sizes.

**Payload:** `'small' | 'medium' | 'large'`

```js
interactiveMap.on('map:setsize', (size) => {
  console.log('Map size changed to:', size)
})
```
