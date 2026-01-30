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
