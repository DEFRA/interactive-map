# Map Key Plugin

Renders a key of symbols present on the map, in a key panel.

Today, the [Datasets](./datasets.md) plugin is wired up to it via a dedicated hook — datasets and sublayers configured with `showInKey: true` feed their styled symbols into the key panel automatically. Other plugins may hook into the key panel in future, but that isn't built yet; Datasets is currently the only integration.

The plugin holds no dataset-specific config itself — when paired with the Datasets plugin, it reads dataset styling from that plugin's registry at runtime via that hook. There's nothing to configure to make that connection; both plugins just need to be present in `plugins`.

> [!NOTE]
> Buttons render in the shared `top-left` slot in the order their plugins appear in the `plugins` array — list `datasetsPlugin` before `mapKeyPlugin` to get Layers before Key.

## ESM usage

```js
import createDatasetsPlugin from '@defra/interactive-map/plugins/datasets'
import createMapKeyPlugin from '@defra/interactive-map/plugins/map-key'

const datasetsPlugin = createDatasetsPlugin({
  datasets: [
    {
      id: 'my-parcels',
      label: 'My parcels',
      geojson: 'https://example.com/api/parcels',
      showInKey: true,
      showInMenu: true,
      style: {
        stroke: '#d4351c',
        strokeWidth: 2,
        fill: 'transparent'
      }
    }
  ]
})

const mapKeyPlugin = createMapKeyPlugin()

const interactiveMap = new InteractiveMap({
  plugins: [datasetsPlugin, mapKeyPlugin]
})
```

## UMD usage

Copy the entire `plugins/map-key/dist/umd/` directory to `/your-assets-path/plugins/map-key/umd/`. The plugin uses dynamic imports, so all files in the directory must be served from the same location. Then add the script tag alongside the Datasets plugin's:

```html
<script defer src="/your-assets-path/plugins/datasets/umd/index.js"></script>
<script defer src="/your-assets-path/plugins/map-key/umd/index.js"></script>
```

```js
const datasetsPlugin = defra.datasetsPlugin({
  datasets: [
    {
      id: 'my-parcels',
      label: 'My parcels',
      geojson: 'https://example.com/api/parcels',
      showInKey: true,
      showInMenu: true,
      style: {
        stroke: '#d4351c',
        strokeWidth: 2,
        fill: 'transparent'
      }
    }
  ]
})

const mapKeyPlugin = defra.mapKeyPlugin()

const interactiveMap = new defra.InteractiveMap('map', {
  mapProvider: defra.maplibreProvider(),
  plugins: [datasetsPlugin, mapKeyPlugin]
})
```

> [!NOTE]
> **GOV.UK Prototype Kit** — skip the copy step. All files are served automatically. Use this path instead:
> ```html
> <script defer src="/plugin-assets/%40defra%2Finteractive-map/plugins/map-key/dist/umd/index.js"></script>
> ```

## Options

Options are passed to the factory function when creating the plugin.

---

### `noKeyItemText`

**Type:** `string`
**Default:** `'No features displayed'`

Text shown in the key panel when it has no visible entries to display — for example, no datasets or sublayers configured with `showInKey: true` currently have visible features on the map.

```js
createMapKeyPlugin({ noKeyItemText: 'No layers to show' })
```

---

### `includeModes`

**Type:** `string[]`

When set, the plugin only initialises when the app is in one of the specified modes.

---

### `excludeModes`

**Type:** `string[]`

When set, the plugin does not initialise when the app is in one of the specified modes.

---

## Key display properties

These properties control how an entry looks in the key panel — they have no effect on how a feature renders on the map itself. Today the only way to set them is via a dataset's [`style`](./datasets.md#style) object, since Datasets is the only plugin feeding this key panel.

---

### `keySymbolShape`

**Type:** `'polygon' | 'line'`
**Default:** `'polygon'`

Overrides the shape used to render a polygon/line entry's symbol in the key.

---

### `symbolDescription`

**Type:** `string | Record<string, string>`

Accessible description of the symbol shown alongside its key entry.

---

## Methods

This plugin does not expose any public methods.

## Events

This plugin does not emit any custom events.
