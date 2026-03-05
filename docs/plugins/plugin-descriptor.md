# PluginDescriptor

Descriptor for lazy-loading a plugin.

## Creating a Plugin Descriptor

Plugins typically export a factory function that returns a PluginDescriptor. This pattern allows configuration to be passed when registering the plugin:

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

Any properties passed to the factory (except `id` and `load`) are available as [pluginConfig](./plugin-context.md#pluginconfig) within the plugin:

```js
// Registering the plugin with configuration
import createScaleBarPlugin from '@defra/interactive-map-plugin-scale-bar'

const interactiveMap = new InteractiveMap({
  plugins: [
    createScaleBarPlugin({ units: 'imperial' })
  ]
})
```

```js
// Accessing configuration within the plugin
export function ScaleBar ({ mapState, pluginConfig }) {
  const { units } = pluginConfig
  // ...
}
```

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique plugin identifier.

---

### `load`
**Type:** `function`
**Required**

Async function that loads and returns a [PluginManifest](./plugin-manifest.md).

```ts
() => Promise<PluginManifest>
```

---

### `manifest`
**Type:** `Partial<PluginManifest>`

Optional manifest overrides. Allows overriding properties of the loaded [PluginManifest](./plugin-manifest.md).

Use when you need to customise the UI of a plugin at registration time — particularly for predefined or third-party plugins where you cannot modify the original manifest directly.

Only the properties you provide are merged into the loaded manifest. Overrides are matched by `id`.

#### Example

This example:

- Moves the `mapStyles` button to the `right-top` slot on desktop.
- Hides the button label.
- Positions the related panel so it opens from the `map-styles-button` slot.
- Sets the panel width to `400px`.
- Makes the panel modal.

```js
manifest: {
  buttons: [
    {
      id: 'mapStyles',
      desktop: {
        slot: 'right-top',
        showLabel: false
      }
    }
  ],
  panels: [
    {
      id: 'mapStyles',
      desktop: {
        slot: 'map-styles-button',
        width: '400px',
        modal: true
      }
    }
  ]
}
