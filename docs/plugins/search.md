# Search Plugin

Location search plugin with autocomplete functionality. Supports custom datasets for searching locations, addresses, or other geographic features.

## Usage

```js
import createSearchPlugin from '@defra/interactive-map/plugins/search'

const searchPlugin = createSearchPlugin({
  showMarker: true,
  datasets: [
    {
      id: 'os-places',
      url: '/api/search',
      minChars: 3
    }
  ]
})

const interactiveMap = new InteractiveMap({
  plugins: [searchPlugin]
})
```

## Options

Options are passed to the factory function when creating the plugin.

---

### `showMarker`
**Type:** `boolean`
**Default:** `true`

Whether to display a marker at the selected location.

---

### `datasets`
**Type:** `SearchDataset[]`

Array of dataset configurations for search. Each dataset defines a source for search suggestions.

```js
createSearchPlugin({
  datasets: [
    {
      id: 'os-places',
      url: '/api/os-places/search',
      minChars: 3,
      params: {
        maxResults: 10
      }
    }
  ]
})
```

---

### `isExpanded`
**Type:** `boolean`
**Default:** `false`

Whether the search input is initially expanded on mobile devices.

---

### `markerColor`
**Type:** `string`

Colour of the search result marker. Overrides the default `markerColor` option.

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

Subscribe to events using `interactiveMap.on()`.

---

### `search:match`

Emitted when a search result is selected.

**Payload:**
```js
{
  query: 'London',
  text: 'London, Greater London',
  point: [lng, lat],
  bounds: [west, south, east, north]
}
```

```js
interactiveMap.on('search:match', ({ query, point, bounds }) => {
  console.log('Location selected:', query)
  console.log('Coordinates:', point)
})
```

---

### `search:open`

Emitted when the search input is expanded (mobile only).

**Payload:** None

```js
interactiveMap.on('search:open', () => {
  console.log('Search opened')
})
```

---

### `search:close`

Emitted when the search input is collapsed or dismissed.

**Payload:** None

```js
interactiveMap.on('search:close', () => {
  console.log('Search closed')
})
```

---

### `search:clear`

Emitted when the search input is cleared.

**Payload:** None

```js
interactiveMap.on('search:clear', () => {
  console.log('Search cleared')
})
```
