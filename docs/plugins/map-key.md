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

### `groups`

**Type:** `Record<string, MapKeyGroupConfig>`

Display options for groups of key entries, keyed by group id.

A dataset's group id is its `groupId`, or otherwise its group label in lower case with spaces replaced by hyphens. Sublayers are grouped under their parent dataset, so a dataset labelled `'Land covers'` with sublayers has the group id `'land-covers'`.

```js
createMapKeyPlugin({
  groups: {
    'land-covers': { groupStyle: 'ramp' }
  }
})
```

#### `groupLabel`

**Type:** `string`

Heading shown above the group. Replaces the heading the group's entries provide.

#### `groupStyle`

**Type:** `'ramp'`

How the group's entries are laid out. Without a `groupStyle`, each entry shows its symbol beside its label.

`'ramp'` shows the entries as touching bands, in order. Each band is filled with the entry's `fill` or fill pattern, and outlined in its `stroke` colour:

- **Horizontal** — bands of equal width in a row, with each label centred below its band. Used when every label fits on one line under its band.
- **Vertical** — bands stacked with each label beside its band. Used when any label doesn't fit.

The layout is chosen again when the key panel resizes, or when the text size changes.

When any entry in the group has a `stroke`, the bands are separated by a small gap.

A ramp suits polygon entries. If any entry in the group has a `symbol` or `symbolSvgContent`, the group is shown without a `groupStyle`.

---

## Key display properties

These properties control how an entry looks in the key panel — they have no effect on how a feature renders on the map itself. Today the only way to set them is via a dataset's [`style`](./datasets.md#style) object, since Datasets is the only plugin feeding this key panel.

---

### Key symbol shape

A polygon/line entry's key symbol is inferred from its style:

- a `stroke` with no `fill` shows as a **line**
- any `fill` shows as a **shape**. For an outline-only shape, set `fill: 'transparent'` — it draws nothing on the map

Symbols and fill patterns show as themselves, whatever the stroke and fill.

---

### `symbolDescription`

**Type:** `string | Record<string, string>`

Accessible description of the symbol shown alongside its key entry.

---

## Methods

This plugin does not expose any public methods.

## Events

This plugin does not emit any custom events.
