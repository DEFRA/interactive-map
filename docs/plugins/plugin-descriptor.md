# PluginDescriptor

Descriptor for lazy-loading a plugin.

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
