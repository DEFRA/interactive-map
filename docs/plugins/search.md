# Search Plugin

Location search with autocomplete. Supports the OS Names API out of the box, and can be extended with custom datasets for searching addresses, features, or other geographic data.

## Usage

```js
import searchPlugin from '@defra/interactive-map/plugins/search'

const interactiveMap = new InteractiveMap({
  plugins: [
    searchPlugin({
      osNamesURL: process.env.OS_NAMES_URL,
      transformRequest: transformGeocodeRequest,
      showMarker: true
    })
  ]
})
```

## Options

Options are passed to the factory function when creating the plugin.

---

### `osNamesURL`
**Type:** `string`

URL for the OS Names API, with a `{query}` placeholder. When provided, the plugin uses this as the primary search source.

```js
searchPlugin({
  osNamesURL: 'https://api.os.uk/search/names/v1/find?query={query}&key=YOUR_KEY'
})
```

---

### `transformRequest`
**Type:** `Function`

Async function called before each search request is sent. Use this to add authentication headers or modify the request. Receives the default request config and the query string, and should return a (modified) request config.

```js
searchPlugin({
  transformRequest: async (request, query) => ({
    ...request,
    headers: { Authorization: `Bearer ${token}` }
  })
})
```

---

### `regions`
**Type:** `string[]`
**Default:** `['england', 'scotland', 'wales']`

Filters OS Names results to the specified UK regions. Values are matched case-insensitively against the country field in OS Names results.

```js
searchPlugin({
  regions: ['england', 'wales']
})
```

---

### `customDatasets`
**Type:** `CustomDataset[]`

Array of custom dataset configurations to extend or replace the built-in OS Names search. Each dataset defines how to fetch and parse results for a particular type of query.

See [Custom datasets](#custom-datasets) below for full details.

```js
searchPlugin({
  customDatasets: [gridRefDataset, parcelDataset]
})
```

---

### `showMarker`
**Type:** `boolean`
**Default:** `true`

Whether to place a marker on the map when a search result is selected.

---

### `marker`
**Type:** `MarkerOptions`

Appearance of the marker placed when a search result is selected. Accepts the same properties as [`MarkerOptions`](../api/marker-config.md#markeroptions). See [Symbol Config](../api/symbol-config.md) for the full property reference.

```js
searchPlugin({
  showMarker: true,
  marker: {
    symbol: 'circle',
    backgroundColor: { outdoor: '#1d70b8', dark: '#5694ca' }
  }
})
```

When not set, the marker inherits from the constructor `symbolDefaults` cascade.

---

### `width`
**Type:** `string`

CSS width of the search input on tablet and desktop. For example `'300px'`.

---

### `expanded`
**Type:** `boolean`
**Default:** `false`

Controls whether the search input is always visible or hidden behind an open button.

- **Mobile** — by default the search is hidden and requires a button tap to open. When `expanded: true`, it moves to the banner slot and is shown inline at the top of the map at all times.
- **Tablet and desktop** — the search always sits in the `top-left` slot regardless of this setting, but setting `expanded: true` removes the open button so the input is immediately visible without interaction.

---

### `includeModes`
**Type:** `string[]`

Array of mode identifiers. When set, the plugin only renders when the app is in one of these modes.

---

### `excludeModes`
**Type:** `string[]`

Array of mode identifiers. When set, the plugin does not render when the app is in one of these modes.

---

## Custom datasets

Custom datasets let you add your own search sources alongside or instead of OS Names. Pass them via the `customDatasets` option as an array of dataset configuration objects.

```js
const gridRefDataset = {
  name: 'gridref',
  includeRegex: /^[A-Z]{2}\d{6,10}$/i,
  buildRequest: (query) => `https://api.example.com/gridref?q=${query}`,
  parseResults: (json, query) => [{
    id: query,
    text: query,
    marked: `<mark>${query}</mark> (Grid reference)`,
    point: [json.lon, json.lat],
    bounds: [json.minLon, json.minLat, json.maxLon, json.maxLat],
    type: 'gridref'
  }]
}

searchPlugin({
  customDatasets: [gridRefDataset]
})
```

### `CustomDataset` properties

---

#### `name`
**Type:** `string`
**Required**

Unique identifier for the dataset. Included as the `type` property in the `search:match` event payload, which lets you distinguish between results from different datasets.

---

#### `buildRequest`
**Type:** `Function`

Function that takes the search query and returns a URL string or a `{ url, options }` fetch config object. Use this when you need custom URL construction or fetch options.

If omitted, `urlTemplate` is used instead.

```js
buildRequest: (query) => ({
  url: `https://api.example.com/search?q=${encodeURIComponent(query)}`,
  options: { headers: { Accept: 'application/json' } }
})
```

---

#### `urlTemplate`
**Type:** `string`

URL template with a `{query}` placeholder. A simpler alternative to `buildRequest` for straightforward GET requests.

```js
urlTemplate: 'https://api.example.com/search?q={query}'
```

---

#### `parseResults`
**Type:** `Function`
**Required**

Function that receives the parsed JSON response and the original query string, and returns an array of suggestion objects. Return an empty array if there are no results.

Each suggestion object must have:

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique identifier for the suggestion |
| `text` | `string` | Display text shown in the autocomplete list |
| `marked` | `string` | Optional. HTML string with query terms wrapped in `<mark>` tags. If omitted, the suggestion label will be blank |
| `point` | `[x, y]` | Centre coordinate for placing a marker |
| `bounds` | `[minX, minY, maxX, maxY]` | Bounding box to fit the map to when selected |
| `type` | `string` | Optional. Value to include in the `search:match` payload to identify the source dataset |

Any additional properties on the suggestion object are passed through in the `search:match` event payload.

---

#### `includeRegex`
**Type:** `RegExp`

If provided, the dataset is only queried when the input matches this pattern. Useful for datasets that only apply to specific input formats (e.g. grid references, parcel IDs).

---

#### `excludeRegex`
**Type:** `RegExp`

If provided, the dataset is skipped when the input matches this pattern.

---

#### `exclusive`
**Type:** `boolean`

When `true`, if this dataset returns results no other datasets will be queried. Useful for high-confidence lookups where you want to suppress the OS Names fallback.

---

## Methods

This plugin does not expose any public methods.

---

## Events

Subscribe to events using `interactiveMap.on()`.

---

### `search:match`

Emitted when the user selects a search result.

**Payload:**

The full suggestion object returned by the dataset's `parseResults` function, plus the original `query` string. At minimum:

```js
{
  query: 'NY7019',          // The original search input
  id: '...',
  text: 'NY 701 924',
  marked: '<mark>NY 701 924</mark> (Grid reference)',
  point: [lng, lat],
  bounds: [west, south, east, north],
  type: 'gridref'           // The dataset name, useful for distinguishing result types
  // ...any other properties returned by parseResults
}
```

```js
interactiveMap.on('search:match', (e) => {
  if (e.type === 'parcel') {
    interactPlugin.selectFeature({ featureId: e.properties.id, layerId: 'parcels' })
  }
})
```

---

### `search:clear`

Emitted when the search input is cleared.

**Payload:** None

```js
interactiveMap.on('search:clear', () => {
  interactPlugin.unselectFeature({ featureId: selectedId })
})
```

---

### `search:open`

Emitted when the open button is clicked to expand the search. Only applies when `expanded` is `false`, as that is the only case where an open button is rendered.

**Payload:** None

---

### `search:close`

Emitted when the search is dismissed — via the close button, a click outside the search, or (on mobile only) after a suggestion is selected or the form is submitted.

**Payload:** None
