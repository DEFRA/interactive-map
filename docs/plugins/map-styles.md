# Map Styles Plugin

Map style switching plugin that adds a UI control for changing the basemap appearance and the map size.

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
      id: 'default',
      label: 'Default',
      url: '/styles/default.json',
      appColorScheme: 'light',
      mapColorScheme: 'light',
      backgroundColor: '#f5f5f5',
      thumbnail: '/images/default-thumb.png'
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

## Methods

This plugin does not expose any public methods.

## Events

This plugin does not emit any custom events. Style changes are handled internally and update the map automatically.
