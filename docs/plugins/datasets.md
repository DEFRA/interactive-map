# Datasets Plugin

The datasets plugin renders GeoJSON and vector tile datasets on the map, with support for sublayer style rules, layer visibility toggling, a key panel, and runtime style and data updates.

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
      toggleVisibility: true,
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
**Default:** none — omitting this option disables eviction entirely

Only applies to dynamic sources (those using `transformRequest`). When set, the plugin tracks how many features are held in memory across all viewport fetches and evicts older features once the limit is exceeded.

Eviction triggers at 120% of `maxFeatures` to avoid running on every fetch when hovering near the limit. Out-of-viewport features are evicted first, sorted by how recently they were visible. Features currently in the viewport are only evicted if out-of-viewport eviction alone is not sufficient. When features are evicted, the plugin resets its tracked fetch area so those regions will be re-fetched if the user pans back.

**When to set it:** omit `maxFeatures` for small or bounded datasets where accumulation is not a concern. Set it when your dataset is large enough that features could accumulate significantly over a long session — for example a national-scale dataset at medium zoom, or any dataset where users are expected to pan extensively.

```js
{
  id: 'my-parcels',
  geojson: 'https://example.com/api/parcels',
  transformRequest: transformDataRequest,
  idProperty: 'id',
  maxFeatures: 10000
}
```

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

### `toggleVisibility`

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
| `opacity` | `number` | Layer opacity from `0` to `1` |
| `symbolDescription` | `string \| Record<string, string>` | Accessible description of the symbol shown in the key |
| `keySymbolShape` | `'polygon' \| 'line'` | Shape used for the key symbol |

```js
style: {
  stroke: { outdoor: '#d4351c', dark: '#ffffff' },
  strokeWidth: 2,
  fill: 'rgba(212,53,28,0.1)',
  symbolDescription: { outdoor: 'Red outline' }
}
```

---

### `sublayers`

**Type:** `Sublayer[]`

Array of sublayer rules that partition the dataset into visually distinct groups based on feature filters. Each sublayer is rendered as a separate pair of map layers.

Sublayers inherit the parent dataset's style and only override what they specify. Fill precedence (highest to lowest): sublayer's own `fillPattern` → sublayer's own `fill` → parent's `fillPattern` → parent's `fill`.

#### `Sublayer` properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | **Required.** Unique identifier within the dataset |
| `label` | `string` | Human-readable name shown in the Layers and Key panels |
| `filter` | `FilterExpression` | MapLibre filter expression to match features for this sublayer |
| `style` | `Object` | Style overrides for this sublayer. Accepts the same properties as the dataset `style` object |
| `showInKey` | `boolean` | Shows this sublayer in the Key panel. Inherits from dataset if not set |
| `toggleVisibility` | `boolean` | Shows this sublayer in the Layers panel. **Default:** `false` |

```js
sublayers: [
  {
    id: 'active',
    label: 'Active parcels',
    filter: ['==', ['get', 'status'], 'active'],
    toggleVisibility: true,
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
    toggleVisibility: true,
    style: {
      stroke: '#d4351c',
      fillPattern: 'diagonal-cross-hatch',
      fillPatternForegroundColor: '#d4351c'
    }
  }
]
```

---

## Methods

Methods are called on the plugin instance after the `datasets:ready` event.

---

### `addDataset(dataset)`

Add a new dataset to the map at runtime.

| Parameter | Type | Description |
|-----------|------|-------------|
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

| Parameter | Type | Description |
|-----------|------|-------------|
| `datasetId` | `string` | ID of the dataset to remove |

```js
datasetsPlugin.removeDataset('my-parcels')
```

---

### `showDataset(datasetId)`

Make a hidden dataset visible. If the dataset has sublayers, any that were individually hidden before the dataset was hidden will remain hidden — their individual visibility state is preserved.

| Parameter | Type | Description |
|-----------|------|-------------|
| `datasetId` | `string` | ID of the dataset |

```js
datasetsPlugin.showDataset('my-parcels')
```

---

### `hideDataset(datasetId)`

Hide a visible dataset and all its sublayers. Individual sublayer visibility state is preserved so it can be correctly restored when the dataset is shown again.

| Parameter | Type | Description |
|-----------|------|-------------|
| `datasetId` | `string` | ID of the dataset |

```js
datasetsPlugin.hideDataset('my-parcels')
```

---

### `showSublayer(datasetId, sublayerId)`

Make a hidden sublayer visible. Has no effect if the parent dataset is currently hidden.

| Parameter | Type | Description |
|-----------|------|-------------|
| `datasetId` | `string` | ID of the dataset |
| `sublayerId` | `string` | ID of the sublayer |

```js
datasetsPlugin.showSublayer('my-parcels', 'active')
```

---

### `hideSublayer(datasetId, sublayerId)`

Hide a single sublayer without affecting the parent dataset or other sublayers.

| Parameter | Type | Description |
|-----------|------|-------------|
| `datasetId` | `string` | ID of the dataset |
| `sublayerId` | `string` | ID of the sublayer |

```js
datasetsPlugin.hideSublayer('my-parcels', 'active')
```

---

### `showFeatures(options)`

Show previously hidden features within a dataset.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |
| `options.featureIds` | `(string \| number)[]` | IDs of features to show |
| `options.idProperty` | `string \| null` | Property name to match features on. Pass `null` to match against the top-level `feature.id` instead |

```js
// Match by a feature property
datasetsPlugin.showFeatures({
  datasetId: 'my-parcels',
  featureIds: [123, 456],
  idProperty: 'parcel_id'
})

// Match by feature.id (no property needed)
datasetsPlugin.showFeatures({
  datasetId: 'my-parcels',
  featureIds: [123, 456],
  idProperty: null
})
```

---

### `hideFeatures(options)`

Hide specific features within a dataset without removing them from the source.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |
| `options.featureIds` | `(string \| number)[]` | IDs of features to hide |
| `options.idProperty` | `string \| null` | Property name to match features on. Pass `null` to match against the top-level `feature.id` instead |

```js
// Match by a feature property
datasetsPlugin.hideFeatures({
  datasetId: 'my-parcels',
  featureIds: [123, 456],
  idProperty: 'parcel_id'
})

// Match by feature.id (no property needed)
datasetsPlugin.hideFeatures({
  datasetId: 'my-parcels',
  featureIds: [123, 456],
  idProperty: null
})
```

---

### `setStyle(options)`

Update the visual style of a dataset at runtime. Affects only properties that sublayers do not themselves override.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |
| `options.style` | `Object` | Style properties to apply. Accepts the same properties as `dataset.style` |

```js
datasetsPlugin.setStyle({
  datasetId: 'my-parcels',
  style: {
    stroke: '#0000ff',
    strokeWidth: 3
  }
})
```

---

### `setSublayerStyle(options)`

Update the visual style of a specific sublayer at runtime.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |
| `options.sublayerId` | `string` | ID of the sublayer |
| `options.style` | `Object` | Style properties to apply. Accepts the same properties as `sublayer.style` |

```js
datasetsPlugin.setSublayerStyle({
  datasetId: 'my-parcels',
  sublayerId: 'active',
  style: {
    stroke: '#00703c',
    fillPattern: 'diagonal-cross-hatch',
    fillPatternForegroundColor: '#00703c'
  }
})
```

---

### `getStyle(options)`

Returns the current style object for a dataset, or `null` if the dataset is not found.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |

```js
const style = datasetsPlugin.getStyle({ datasetId: 'my-parcels' })
console.log(style) // { stroke: '#d4351c', strokeWidth: 2, ... }
```

---

### `getSublayerStyle(options)`

Returns the current style object for a sublayer, or `null` if the dataset or sublayer is not found.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |
| `options.sublayerId` | `string` | ID of the sublayer |

```js
const style = datasetsPlugin.getSublayerStyle({ datasetId: 'my-parcels', sublayerId: 'active' })
console.log(style) // { stroke: '#00703c', fill: 'rgba(0,112,60,0.1)' }
```

---

### `setOpacity(opacity)` / `setOpacity(datasetId, opacity)`

Set the opacity of all datasets or a single dataset. Safe to call on every tick from a slider — uses `setPaintProperty` internally rather than removing and re-adding layers.

| Argument | Type | Description |
|----------|------|-------------|
| `opacity` | `number` | Opacity from `0` (transparent) to `1` (fully opaque). Omit `datasetId` to apply globally |
| `datasetId` | `string` | Optional. When provided, only that dataset is affected |

```js
// Global — all datasets
datasetsPlugin.setOpacity(0.5)

// Single dataset
datasetsPlugin.setOpacity('my-parcels', 0.5)
```

---

### `getOpacity()` / `getOpacity(datasetId)`

Returns the current opacity for a dataset, or the first dataset's opacity when called without arguments. Returns `null` if the dataset is not found.

| Argument | Type | Description |
|----------|------|-------------|
| `datasetId` | `string` | Optional. When omitted, returns the opacity of the first dataset |

```js
// Read back after setting globally — useful for initialising a slider
const opacity = datasetsPlugin.getOpacity()

// Single dataset
const opacity = datasetsPlugin.getOpacity('my-parcels')
```

---

### `setSublayerOpacity(datasetId, sublayerId, opacity)`

Set the opacity of a single sublayer. Safe to call on every tick from a slider.

| Argument | Type | Description |
|----------|------|-------------|
| `datasetId` | `string` | ID of the dataset |
| `sublayerId` | `string` | ID of the sublayer |
| `opacity` | `number` | Opacity from `0` to `1` |

```js
datasetsPlugin.setSublayerOpacity('my-parcels', 'active', 0.5)
```

---

### `getSublayerOpacity(datasetId, sublayerId)`

Returns the current opacity for a sublayer, or `null` if the dataset or sublayer is not found.

| Argument | Type | Description |
|----------|------|-------------|
| `datasetId` | `string` | ID of the dataset |
| `sublayerId` | `string` | ID of the sublayer |

```js
const opacity = datasetsPlugin.getSublayerOpacity('my-parcels', 'active')
```

---

### `setData(options)`

Replace the GeoJSON data for a dataset source. Has no effect on vector tile datasets — use `transformRequest` for those.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options.datasetId` | `string` | ID of the dataset |
| `options.geojson` | `GeoJSON.FeatureCollection` | New GeoJSON data |

```js
datasetsPlugin.setData({
  datasetId: 'my-parcels',
  geojson: { type: 'FeatureCollection', features: [...] }
})
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
  const style = datasetsPlugin.getStyle({ datasetId: 'my-parcels' })
})
```
