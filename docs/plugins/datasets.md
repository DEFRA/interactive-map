# Datasets Plugin

The datasets plugin renders GeoJSON and vector tile datasets on the map, with support for polygon, line, and symbol (point) layer types, sublayer style rules, layer visibility toggling, a key panel, and runtime style and data updates.

## ESM usage

```js
import createDatasetsPlugin from '@defra/interactive-map/plugins/datasets'

const datasetsPlugin = createDatasetsPlugin({
  datasets: [
    {
      id: 'my-parcels',
      label: 'My parcels',
      geojson: 'https://example.com/api/parcels',
      minZoom: 10,
      maxZoom: 24,
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

const interactiveMap = new InteractiveMap({
  plugins: [datasetsPlugin]
})
```

## UMD usage

Copy the entire `plugins/beta/datasets/dist/umd/` directory to `/your-assets-path/plugins/beta/datasets/umd/`. The plugin uses dynamic imports, so all files in the directory must be served from the same location. Then add the script tag:

```html
<script defer src="/your-assets-path/plugins/beta/datasets/umd/index.js"></script>
```

```js
const datasetsPlugin = defra.datasetsPlugin({
  datasets: [
    {
      id: 'my-parcels',
      label: 'My parcels',
      geojson: 'https://example.com/api/parcels',
      minZoom: 10,
      maxZoom: 24,
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

const interactiveMap = new defra.InteractiveMap('map', {
  mapProvider: defra.maplibreProvider(),
  plugins: [datasetsPlugin]
})
```

> [!NOTE]
> **GOV.UK Prototype Kit** — skip the copy step. All files are served automatically. Use this path instead:
> ```html
> <script defer src="/plugin-assets/%40defra%2Finteractive-map/plugins/beta/datasets/dist/umd/index.js"></script>
> ```

## Options

Options are passed to the factory function when creating the plugin.

---

### `datasets`

**Type:** `Dataset[]`
**Required**

Array of dataset configurations to render on the map. See [Dataset configuration](#dataset-configuration) below.

---

### `includeModes`

**Type:** `string[]`

When set, the plugin only initialises when the app is in one of the specified modes.

---

### `excludeModes`

**Type:** `string[]`

When set, the plugin does not initialise when the app is in one of the specified modes.

---

## Dataset configuration

Each entry in the `datasets` array describes one data source and how it should be rendered.

---

### `id`

**Type:** `string`
**Required**

Unique identifier for the dataset. Used in all API method calls.

---

### `label`

**Type:** `string`

Human-readable name shown in the LayersMenu panel and Key panel.

---

### `geojson`

**Type:** `string | GeoJSON.FeatureCollection`

GeoJSON source. Provide a URL string for remote data, or a `FeatureCollection` object for inline data.

For data that needs authentication headers or viewport-based filtering, use `dynamicGeoJSON` instead.

---

### `dynamicGeoJSON`

**Type:** `Object`

Enables dynamic, bbox-aware GeoJSON fetching — the plugin calls your API as the map pans and zooms, loading features for the current viewport and evicting distant ones. Configure this instead of `geojson` when your data is too large to load all at once.

| Property | Type | Description |
|----------|------|-------------|
| `url` | `string` | **Required.** Base URL for the GeoJSON API endpoint |
| `idProperty` | `string` | **Required.** Property name that uniquely identifies each feature. Used for deduplication across viewport fetches |
| `transformRequest` | `Function` | Called before each fetch. Return a URL string or `{ url, headers }` object to add auth headers or modify the URL |
| `maxFeatures` | `number` | Optional. Cap on features held in memory across all viewport fetches. Older out-of-viewport features are evicted when exceeded |

**`transformRequest` signature:** `transformRequest(url, { bbox, zoom, dataset })`

| Argument | Type | Description |
|----------|------|-------------|
| `url` | `string` | The base URL |
| `bbox` | `number[]` | Current viewport bounds as `[west, south, east, north]` |
| `zoom` | `number` | Current map zoom level |
| `dataset` | `Object` | The full dataset configuration |

```js
{
  id: 'land-parcels',
  dynamicGeoJSON: {
    url: 'https://example.com/api/parcels',
    idProperty: 'parcel_id',
    transformRequest: (url, { bbox }) => {
      const separator = url.includes('?') ? '&' : '?'
      return {
        url: `${url}${separator}bbox=${bbox.join(',')}`,
        headers: { Authorization: `Bearer ${getToken()}` }
      }
    },
    maxFeatures: 50000
  },
  minZoom: 10,
  style: { stroke: '#d4351c', strokeWidth: 2 }
}
```

---

### `tiles`

**Type:** `string | string[]`

Vector tile URL template or array of templates (e.g. `'https://example.com/tiles/{z}/{x}/{y}'`). When set, the dataset uses a vector tile source instead of GeoJSON.

---

### `sourceLayer`

**Type:** `string`

The layer name within the vector tile source to render. Required when using `tiles`.

---

### `idProperty`

**Type:** `string`

Property name used to uniquely identify features in a static `geojson` source. When set, the plugin promotes this property to the MapLibre feature ID (`promoteId`) so that feature IDs are stable and derived from your data rather than auto-generated.

Required for `setFeatureVisibility` to work correctly — the IDs you pass must match the values of this property in your data.

> [!NOTE]
> For `dynamicGeoJSON` sources, set `idProperty` inside the `dynamicGeoJSON` object, not here.

```js
// Features have { properties: { parcel_id: 'ABC123', ... } }
{
  id: 'my-parcels',
  geojson: 'https://example.com/api/parcels',
  idProperty: 'parcel_id'
}
```

---

### `generateIds`

**Type:** `boolean`

When `true`, MapLibre auto-generates integer IDs for GeoJSON features by their array index position (0-based). Use this when your features have no natural unique ID property and you need `setFeatureVisibility` to work.

> [!NOTE]
> Auto-generated IDs are positional and reset on every `setData` call. If your data changes between calls, the same integer ID may refer to a different feature. Prefer `idProperty` whenever your data has a stable unique field.

```js
{
  id: 'my-parcels',
  geojson: 'https://example.com/api/parcels',
  generateIds: true
}
```

---

### `filter`

**Type:** `FilterExpression`

A MapLibre filter expression applied to the dataset's map layers. Features not matching the filter are not rendered.

```js
filter: ['==', ['get', 'status'], 'active']
```

---

### `minZoom`

**Type:** `number`
**Default:** `6`

Minimum zoom level at which the dataset is visible.

---

### `maxZoom`

**Type:** `number`
**Default:** `24`

Maximum zoom level at which the dataset is visible.

---

### `visible`

**Type:** `boolean`
**Default:** `true`

Initial visibility of the dataset.

---

### `showInKey`

**Type:** `boolean`
**Default:** `false`

When `true`, the dataset appears in the Key panel with its style symbol and label.

---

### `showInMenu`

**Type:** `boolean`
**Default:** `false`

When `true`, the dataset appears in the LayersMenu panel and can be toggled on and off by the user.

---

### `groupLabel`

**Type:** `string`

Groups this dataset with others sharing the same `groupLabel` in the LayersMenu panel, rendering them as a single collapsible group.

---

### `keySymbolShape`

**Type:** `'polygon' | 'line'`

Overrides the shape used to render the key symbol for this dataset. Defaults to a polygon shape.

---

### `style`

**Type:** `Object`

Visual style for the dataset. All style properties must be nested within this object.

**Common properties:**

| Property | Type | Description |
|----------|------|-------------|
| `opacity` | `number` | Layer opacity from `0` to `1` |
| `symbolDescription` | `string \| Record<string, string>` | Accessible description of the symbol shown in the key |

**Polygon/line properties:**

| Property | Type | Description |
|----------|------|-------------|
| `stroke` | `string \| Record<string, string>` | Stroke (outline) colour. Accepts a plain colour string or a map-style-keyed object e.g. `{ outdoor: '#ff0000', dark: '#ffffff' }` |
| `strokeWidth` | `number` | Stroke width in pixels. **Default:** `2` |
| `strokeDashArray` | `number[]` | Dash pattern for the stroke e.g. `[4, 2]` |
| `fill` | `string \| Record<string, string>` | Fill colour. Use `'transparent'` for no fill |
| `fillPattern` | `string` | Named fill pattern e.g. `'diagonal-cross-hatch'`, `'horizontal-hatch'`, `'dot'`, `'vertical-hatch'` |
| `fillPatternSvgContent` | `string` | Raw SVG content for a custom fill pattern |
| `fillPatternForegroundColor` | `string \| Record<string, string>` | Foreground colour for the fill pattern |
| `fillPatternBackgroundColor` | `string \| Record<string, string>` | Background colour for the fill pattern |
| `keySymbolShape` | `'polygon' \| 'line'` | Shape used for the key symbol |

**Symbol (point) properties:**

Setting `symbol` or `symbolSvgContent` renders the dataset as a point layer instead of a polygon/line layer.

| Property | Type | Description |
|----------|------|-------------|
| `symbol` | `string` | Registered symbol ID e.g. `'pin'`, `'circle'`, `'square'` |
| `symbolSvgContent` | `string` | Inline SVG content for a fully custom symbol (no `<svg>` wrapper). Takes precedence over `symbol` |
| `symbolViewBox` | `string` | SVG viewBox for the symbol e.g. `'0 0 38 38'`. Defaults to the registered symbol's viewBox |
| `symbolAnchor` | `[number, number]` | Anchor point as a normalised `[x, y]` pair. Defaults to the registered symbol's anchor |
| `symbolBackgroundColor` | `string \| Record<string, string>` | Background fill colour of the symbol |
| `symbolForegroundColor` | `string \| Record<string, string>` | Foreground fill colour of the symbol (e.g. the inner dot) |
| `symbolHaloWidth` | `string` | Stroke width of the halo in SVG units |
| `symbolGraphic` | `string` | SVG `d` attribute for the foreground graphic path. Use named values (`'dot'`, `'cross'`, `'diamond'`, `'triangle'`, `'square'`) or supply your own path data |

Symbol colour properties use the `symbol` prefix to distinguish them from polygon/line properties in the same style object. They follow the same resolution order and support style-keyed colour objects in the same way as markers — see [Symbol Config](../api/symbol-config.md) for details.

`haloColor` and `selectedColor` are not settable here — they are basemap-level properties set on [`MapStyleConfig`](../api/map-style-config.md).

```js
// Polygon/line dataset
style: {
  stroke: { outdoor: '#d4351c', dark: '#ffffff' },
  strokeWidth: 2,
  fill: 'rgba(212,53,28,0.1)',
  symbolDescription: { outdoor: 'Red outline' }
}

// Point dataset — registered symbol with colour overrides
style: {
  symbol: 'pin',
  symbolBackgroundColor: '#1d70b8',
  symbolForegroundColor: '#ffffff'
}

// Point dataset — style-keyed colours for multi-basemap support
style: {
  symbol: 'pin',
  symbolBackgroundColor: { outdoor: '#1d70b8', dark: '#5694ca' }
}

// Point dataset — custom inline SVG
style: {
  symbolSvgContent: '<circle cx="19" cy="19" r="12" fill="{{backgroundColor}}"/>',
  symbolViewBox: '0 0 38 38',
  symbolAnchor: [0.5, 0.5],
  symbolBackgroundColor: '#1d70b8'
}
```

---

### `sublayers`

**Type:** `Sublayer[]`

Array of sublayer rules that partition the dataset into visually distinct groups based on feature filters. Each sublayer is rendered as a separate map layer.

Sublayer styles merge over the parent's — the sublayer wins on any property it sets. Rendering type is driven by the merged result: `symbol` > `fillPattern`/`fill` > `stroke`.

#### `Sublayer` properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | **Required.** Unique identifier within the dataset |
| `label` | `string` | Human-readable name shown in the LayersMenu and Key panels |
| `filter` | `FilterExpression` | MapLibre filter expression to match features for this sublayer |
| `style` | `Object` | Style overrides. Accepts the same properties as the dataset `style` object |
| `showInKey` | `boolean` | Shows this sublayer in the Key panel. Inherits from dataset if not set |
| `showInMenu` | `boolean` | Shows this sublayer in the LayersMenu panel. **Default:** `false` |

**Polygon/line example:**

```js
sublayers: [
  {
    id: 'active',
    label: 'Active parcels',
    filter: ['==', ['get', 'status'], 'active'],
    showInMenu: true,
    style: {
      stroke: '#00703c',
      fill: 'rgba(0,112,60,0.1)',
      symbolDescription: 'Green outline'
    }
  },
  {
    id: 'inactive',
    label: 'Inactive parcels',
    filter: ['==', ['get', 'status'], 'inactive'],
    showInMenu: true,
    style: {
      stroke: '#d4351c',
      fillPattern: 'diagonal-cross-hatch',
      fillPatternForegroundColor: '#d4351c'
    }
  }
]
```

**Symbol (point) example — scheduled monuments by type:**

Here the parent defines the shared symbol shape; each sublayer only overrides what differs.

```js
{
  id: 'scheduled-monuments',
  geojson: scheduledMonumentsData,
  style: { symbol: 'square' },
  sublayers: [
    {
      id: 'prehistoric',
      label: 'Prehistoric sites',
      filter: ['==', ['get', 'type'], 'prehistoric'],
      showInKey: true,
      showInMenu: true,
      style: { symbolBackgroundColor: '#0f7a52' }
    },
    {
      id: 'roman',
      label: 'Roman sites',
      filter: ['==', ['get', 'type'], 'roman'],
      showInKey: true,
      showInMenu: true,
      style: { symbolBackgroundColor: '#54319f' }
    },
    {
      id: 'medieval',
      label: 'Medieval sites',
      filter: ['==', ['get', 'type'], 'medieval'],
      showInKey: true,
      showInMenu: true,
      style: { symbolBackgroundColor: '#ca357c' }
    }
  ]
}
```

---

## Methods

Methods are called on the plugin instance after the `datasets:ready` event.

The API follows a consistent pattern: the primary value is the first argument, with an optional scope object as the second argument. Omitting the scope applies the operation globally where supported.

---

### `addDataset(dataset)`

Add a new dataset to the map at runtime.

| Argument | Type | Description |
|----------|------|-------------|
| `dataset` | `Dataset` | Dataset configuration object. Accepts the same properties as `datasets` array entries |

```js
interactiveMap.on('datasets:ready', () => {
  datasetsPlugin.addDataset({
    id: 'new-layer',
    geojson: 'https://example.com/api/features',
    minZoom: 10,
    style: { stroke: '#0000ff' }
  })
})
```

---

### `removeDataset(datasetId)`

Remove a dataset from the map.

| Argument | Type | Description |
|----------|------|-------------|
| `datasetId` | `string` | ID of the dataset to remove |

```js
datasetsPlugin.removeDataset('my-parcels')
```

---

### `setDatasetVisibility(visible, scope?)`

Set the visibility of datasets or sublayers. Omit `scope` to apply to all datasets globally.

When showing a dataset that has sublayers, any sublayers that were individually hidden before the dataset was hidden will remain hidden — their individual visibility state is preserved.

| Argument | Type | Description |
|----------|------|-------------|
| `visible` | `boolean` | `true` to show, `false` to hide |
| `scope.datasetId` | `string` | Optional. When omitted, applies to all datasets |
| `scope.sublayerId` | `string` | Optional. When provided alongside `datasetId`, targets a single sublayer |

```js
// Global — all datasets
datasetsPlugin.setDatasetVisibility(false)
datasetsPlugin.setDatasetVisibility(true)

// Single dataset
datasetsPlugin.setDatasetVisibility(false, { datasetId: 'my-parcels' })

// Single sublayer
datasetsPlugin.setDatasetVisibility(false, { datasetId: 'my-parcels', sublayerId: 'active' })
```

---

### `setFeatureVisibility(visible, featureIds, scope)`

Show or hide specific features within a dataset without removing them from the source. The feature IDs you pass are matched against the dataset's `idProperty` value, or against the native feature `id` when `idProperty` is not set.

> [!NOTE]
> The dataset must have `idProperty` or `generateIds: true` configured for feature matching to work. A console warning is emitted if neither is set.

| Argument | Type | Description |
|----------|------|-------------|
| `visible` | `boolean` | `true` to show, `false` to hide |
| `featureIds` | `(string \| number)[]` | IDs of the features to target — must match the `idProperty` values in your data |
| `scope.datasetId` | `string` | ID of the dataset |

```js
// Dataset configured with idProperty: 'parcel_id'
datasetsPlugin.setFeatureVisibility(false, ['ABC123', 'DEF456'], {
  datasetId: 'my-parcels'
})

// Show previously hidden features
datasetsPlugin.setFeatureVisibility(true, ['ABC123'], {
  datasetId: 'my-parcels'
})
```

---

### `setStyle(style, scope)`

Update the visual style of a dataset or sublayer at runtime. When targeting a sublayer, only the properties specified are overridden — the sublayer inherits all other styles from the parent dataset.

For symbol datasets, pass `symbol` as the style property to change the symbol config.

| Argument | Type | Description |
|----------|------|-------------|
| `style` | `Object` | Style properties to apply. Accepts the same properties as `dataset.style`, plus `symbol` |
| `scope.datasetId` | `string` | ID of the dataset |
| `scope.sublayerId` | `string` | Optional. When provided, targets a single sublayer |

```js
// Polygon/line dataset
datasetsPlugin.setStyle(
  { stroke: '#0000ff', strokeWidth: 3 },
  { datasetId: 'my-parcels' }
)

// Sublayer — polygon
datasetsPlugin.setStyle(
  { stroke: '#00703c', fillPattern: 'diagonal-cross-hatch', fillPatternForegroundColor: '#00703c' },
  { datasetId: 'my-parcels', sublayerId: 'active' }
)

// Sublayer — symbol colour override
datasetsPlugin.setStyle(
  { symbolBackgroundColor: '#912b88' },
  { datasetId: 'flood-warnings', sublayerId: 'severe' }
)
```

---

### `getStyle(scope)`

Returns the current style object for a dataset or sublayer, or `null` if not found.

| Argument | Type | Description |
|----------|------|-------------|
| `scope.datasetId` | `string` | ID of the dataset |
| `scope.sublayerId` | `string` | Optional. When provided, returns the sublayer's style |

```js
// Dataset style
const style = datasetsPlugin.getStyle({ datasetId: 'my-parcels' })

// Sublayer style
const style = datasetsPlugin.getStyle({ datasetId: 'my-parcels', sublayerId: 'active' })
```

---

### `setOpacity(opacity, scope?)`

Set the opacity of datasets or a sublayer. Safe to call on every tick from a slider — uses `setPaintProperty` internally rather than removing and re-adding layers. Omit `scope` to apply globally.

| Argument | Type | Description |
|----------|------|-------------|
| `opacity` | `number` | Opacity from `0` (transparent) to `1` (fully opaque) |
| `scope.datasetId` | `string` | Optional. When omitted, applies to all datasets |
| `scope.sublayerId` | `string` | Optional. When provided alongside `datasetId`, targets a single sublayer |

```js
// Global — all datasets
datasetsPlugin.setOpacity(0.5)

// Single dataset
datasetsPlugin.setOpacity(0.5, { datasetId: 'my-parcels' })

// Single sublayer
datasetsPlugin.setOpacity(0.5, { datasetId: 'my-parcels', sublayerId: 'active' })
```

---

### `getOpacity(scope?)`

Returns the current opacity for a dataset or sublayer. When called without arguments, returns the first dataset's opacity — useful for initialising a global slider. Returns `null` if not found.

| Argument | Type | Description |
|----------|------|-------------|
| `scope.datasetId` | `string` | Optional. When omitted, returns the first dataset's opacity |
| `scope.sublayerId` | `string` | Optional. When provided alongside `datasetId`, returns the sublayer's opacity |

```js
// Global — read back after setOpacity() for slider initialisation
const opacity = datasetsPlugin.getOpacity()

// Single dataset
const opacity = datasetsPlugin.getOpacity({ datasetId: 'my-parcels' })

// Single sublayer
const opacity = datasetsPlugin.getOpacity({ datasetId: 'my-parcels', sublayerId: 'active' })
```

---

### `setData(geojson, scope)`

Replace the GeoJSON data for a dataset source. Has no effect on vector tile datasets.

| Argument | Type | Description |
|----------|------|-------------|
| `geojson` | `GeoJSON.FeatureCollection` | New GeoJSON data |
| `scope.datasetId` | `string` | ID of the dataset |

```js
datasetsPlugin.setData(
  { type: 'FeatureCollection', features: [...] },
  { datasetId: 'my-parcels' }
)
```

---

### `setGlobals(values)`

Set global state that applies across all datasets. Currently supports `opacityMode`.

| Argument | Type | Description |
|----------|------|-------------|
| `values.opacityMode` | `'dataset' \| 'global' \| 'multiply'` | Controls how opacity values are combined when both a global opacity and a per-dataset opacity are set |

| Mode | Behaviour |
|------|-----------|
| `'dataset'` | Each dataset uses its own `style.opacity` only. Global opacity is ignored |
| `'global'` | All datasets use the global opacity, ignoring per-dataset values |
| `'multiply'` | Effective opacity is `globalOpacity × datasetOpacity` |

```js
datasetsPlugin.setGlobals({ opacityMode: 'multiply' })
```

---

## Events

Subscribe to events using `interactiveMap.on()`.

---

### `datasets:ready`

Emitted once all datasets have been initialised and rendered on the map.

**Payload:** None

```js
interactiveMap.on('datasets:ready', () => {
  console.log('Datasets are ready')
  // Safe to call API methods from here
  const style = datasetsPlugin.getStyle({ datasetId: 'my-parcels' }) // unchanged — scope object
})
```
