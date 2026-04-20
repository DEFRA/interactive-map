# Datasets Plugin

The datasets plugin renders GeoJSON and vector tile datasets on the map, with support for polygon, line, and symbol (point) layer types, sublayer style rules, layer visibility toggling, a key panel, and runtime style and data updates.

## Usage

```js
import createDatasetsPlugin from '@defra/interactive-map/plugins/beta/datasets'
import { maplibreLayerAdapter } from '@defra/interactive-map/plugins/beta/datasets/adapters/maplibre'

const datasetsPlugin = createDatasetsPlugin({
  layerAdapter: maplibreLayerAdapter,
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

## Options

Options are passed to the factory function when creating the plugin.

---

### `layerAdapter`

**Type:** `LayerAdapter`
**Required**

The map provider adapter responsible for rendering datasets. Import `maplibreLayerAdapter` for MapLibre GL JS, or supply a custom adapter.

```js
import { maplibreLayerAdapter } from '@defra/interactive-map/plugins/beta/datasets/adapters/maplibre'
```

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

Human-readable name shown in the Layers panel and Key panel.

---

### `geojson`

**Type:** `string | GeoJSON.FeatureCollection`

GeoJSON source. Provide a URL string for remote data, or a GeoJSON object for inline data. Use alongside `transformRequest` to add authentication or append bbox parameters to the request.

---

### `tiles`

**Type:** `string[]`

Array of vector tile URL templates (e.g. `https://example.com/tiles/{z}/{x}/{y}`). When set, the dataset uses a vector tile source instead of GeoJSON.

---

### `sourceLayer`

**Type:** `string`

The layer name within the vector tile source to render. Required when using `tiles`.

---

### `transformRequest`

**Type:** `Function`

A function called before each fetch to transform the request. Its primary purpose is to attach authentication credentials — API keys, OAuth tokens, or other headers. It also receives the current viewport context so you can append bbox or zoom parameters to the URL if your API supports spatial filtering.

The plugin handles all dynamic fetching concerns (viewport tracking, debouncing, deduplication, caching, request cancellation) — `transformRequest` only needs to return the final URL and any headers.

**Signature:** `transformRequest(url, { bbox, zoom, dataset })`

| Argument | Type | Description |
|----------|------|-------------|
| `url` | `string` | The base URL from `geojson` |
| `bbox` | `number[]` | Current viewport bounds as `[west, south, east, north]` |
| `zoom` | `number` | Current map zoom level |
| `dataset` | `Object` | The full dataset configuration |

Return either a plain URL string or an object `{ url, headers }`. The object form is needed when attaching auth headers.

```js
// Auth headers only (no bbox filtering)
transformRequest: (url) => ({
  url,
  headers: { Authorization: `Bearer ${getToken()}` }
})

// Append bbox to URL for server-side spatial filtering
transformRequest: (url, { bbox }) => {
  const separator = url.includes('?') ? '&' : '?'
  return { url: `${url}${separator}bbox=${bbox.join(',')}` }
}

// Both — auth + bbox
transformRequest: (url, { bbox }) => {
  const separator = url.includes('?') ? '&' : '?'
  return {
    url: `${url}${separator}bbox=${bbox.join(',')}`,
    headers: { Authorization: `Bearer ${getToken()}` }
  }
}
```

---

### `idProperty`

**Type:** `string`

Property name used to uniquely identify features. Required alongside `transformRequest` to enable dynamic bbox-based fetching — the plugin uses it internally to deduplicate features across successive viewport fetches.

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

### `maxFeatures`

**Type:** `number`

Only applies to dynamic sources (those using `transformRequest`). Caps the number of features held in memory across all viewport fetches — older out-of-viewport features are evicted when the limit is exceeded. Omit for small or bounded datasets; set it when users are likely to pan extensively over a large dataset.

---

### `visibility`

**Type:** `'visible' | 'hidden'`
**Default:** `'visible'`

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

When `true`, the dataset appears in the Layers panel and can be toggled on and off by the user.

---

### `groupLabel`

**Type:** `string`

Groups this dataset with others sharing the same `groupLabel` in the Layers panel, rendering them as a single collapsible group.

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

Sublayers inherit the parent dataset's style and only override what they specify in their own `style` object. For polygon/line datasets, fill precedence is (highest to lowest): sublayer `fillPattern` → sublayer `fill` → parent `fillPattern` → parent `fill`. For symbol datasets, each symbol property is inherited individually from the parent unless the sublayer sets it explicitly.

#### `Sublayer` properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | **Required.** Unique identifier within the dataset |
| `label` | `string` | Human-readable name shown in the Layers and Key panels |
| `filter` | `FilterExpression` | MapLibre filter expression to match features for this sublayer |
| `style` | `Object` | Style overrides. Accepts the same properties as the dataset `style` object |
| `showInKey` | `boolean` | Shows this sublayer in the Key panel. Inherits from dataset if not set |
| `showInMenu` | `boolean` | Shows this sublayer in the Layers panel. **Default:** `false` |

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

When the parent dataset has `symbol` set, each sublayer can override individual symbol properties to represent different categories. Properties not set on the sublayer are inherited from the parent.

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

Show or hide specific features within a dataset without removing them from the source.

| Argument | Type | Description |
|----------|------|-------------|
| `visible` | `boolean` | `true` to show, `false` to hide |
| `featureIds` | `(string \| number)[]` | IDs of the features to target |
| `scope.datasetId` | `string` | ID of the dataset |
| `scope.idProperty` | `string \| null` | Property name to match features on. Pass `null` to match against the top-level `feature.id` |

```js
// Hide by a feature property
datasetsPlugin.setFeatureVisibility(false, [123, 456], {
  datasetId: 'my-parcels',
  idProperty: 'parcel_id'
})

// Show using feature.id
datasetsPlugin.setFeatureVisibility(true, [123, 456], {
  datasetId: 'my-parcels',
  idProperty: null
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
