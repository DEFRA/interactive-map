# Scale Bar Plugin

Displays the current map scale. The scale bar automatically updates as the user zooms in and out.

## Usage

```js
import createScaleBarPlugin from '@defra/interactive-map/plugins/scale-bar'

const scaleBarPlugin = createScaleBarPlugin({
  units: 'metric'
})

const interactiveMap = new InteractiveMap({
  plugins: [scaleBarPlugin]
})
```

## Options

Options are passed to the factory function when creating the plugin.

---

### `units`
**Type:** `'metric' | 'imperial'`
**Default:** `'metric'`

The unit system used to display the scale.

| Value | Description |
|-------|-------------|
| `'metric'` | Displays scale in metres and kilometres |
| `'imperial'` | Displays scale in feet and miles |

```js
createScaleBarPlugin({ units: 'imperial' })
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

This plugin does not emit any custom events.
