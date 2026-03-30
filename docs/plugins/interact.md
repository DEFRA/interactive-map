# Interact Plugin

The interact plugin provides a unified way to handle user interactions for selecting map features or placing location markers.

## Usage

```js
import createInteractPlugin from '@defra/interactive-map/plugins/interact'

const interactPlugin = createInteractPlugin({
  interactionMode: 'auto',
  multiSelect: true,
  dataLayers: [
    { layerId: 'my-layer', idProperty: 'id' }
  ]
})

const interactiveMap = new InteractiveMap({
  plugins: [interactPlugin]
})
```

## Options

Options are passed to the factory function when creating the plugin.

---

### `includeModes`
**Type:** `string[]`

Array of mode identifiers. When set, the plugin only renders when the app is in one of these modes.

---

### `excludeModes`
**Type:** `string[]`

Array of mode identifiers. When set, the plugin does not render when the app is in one of these modes.

---

### `interactionMode`
**Type:** `'marker' | 'select' | 'auto'`
**Default:** `'marker'`

Controls how user clicks are interpreted.

- `'marker'` — clicking always places a location marker at the clicked coordinates
- `'select'` — clicking attempts to match a feature from `dataLayers`; click outside clears selection (unless `deselectOnClickOutside` is `false`)
- `'auto'` — attempts feature matching first, falls back to placing a marker if no feature is found

---

### `dataLayers`
**Type:** `Array<DataLayer>`
**Default:** `[]`

Array of map layer configurations that are selectable. Each entry specifies which layer to watch and how to identify features.

```js
dataLayers: [
  { layerId: 'my-polygons', idProperty: 'id' },
  { layerId: 'my-lines' }
]
```

#### `DataLayer` properties

| Property | Type | Description |
|----------|------|-------------|
| `layerId` | `string` | **Required.** The map layer identifier to enable selection on |
| `idProperty` | `string` | Property name used as the feature's unique identifier. If omitted, features are matched by index |
| `selectedStroke` | `string` | Overrides the global `selectedStroke` for this layer |
| `selectedFill` | `string` | Overrides the global `selectedFill` for this layer |
| `selectedStrokeWidth` | `number` | Overrides the global `selectedStrokeWidth` for this layer |

---

### `multiSelect`
**Type:** `boolean`
**Default:** `false`

When `true`, clicking additional features adds them to the selection rather than replacing it.

---

### `contiguous`
**Type:** `boolean`
**Default:** `false`

When `true`, only features that touch or overlap the existing selection can be added. Uses spatial intersection to determine contiguity. Works with polygons, lines, and points.

---

### `deselectOnClickOutside`
**Type:** `boolean`
**Default:** `false`

When `true`, clicking outside any selectable layer clears the current selection.

---

### `tolerance`
**Type:** `number`
**Default:** `10`

Click detection radius in pixels. Increases the hit area around the cursor when matching features, which is useful for lines and points.

---

### `closeOnAction`
**Type:** `boolean`
**Default:** `true`

When `true`, the app closes after the user clicks "Done" or "Cancel".

---

### `marker`
**Type:** `MarkerOptions`

Appearance of the location marker placed on the map. Accepts the same properties as [`MarkerOptions`](../api/marker-config.md#markeroptions).

```js
createInteractPlugin({
  marker: {
    symbol: 'pin',
    background: { outdoor: '#d4351c', dark: '#ff6b6b' },
    foreground: '#ffffff'
  }
})
```

When not set, the marker uses the symbol defaults.

---

### `selectedStroke`
**Type:** `string`
**Default:** `'rgba(212,53,28,1)'`

Stroke color used to highlight selected features. Can be overridden per layer via `dataLayers`.

---

### `selectedFill`
**Type:** `string`
**Default:** `'rgba(255, 0, 0, 0.1)'`

Fill color used to highlight selected features. Can be overridden per layer via `dataLayers`.

---

### `selectedStrokeWidth`
**Type:** `number`
**Default:** `2`

Stroke width used to highlight selected features. Can be overridden per layer via `dataLayers`.

---

## Methods

Methods are called on the plugin instance after the map is ready.

---

### `enable(options?)`

Enable interaction mode. Shows action buttons and enables feature selection or marker placement. Accepts an optional options object to override any of the factory options at runtime.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Object` | Optional. Any factory options to apply for this session |

```js
interactiveMap.on('map:ready', () => {
  interactPlugin.enable()
})

// Override options at runtime
interactPlugin.enable({ multiSelect: true, interactionMode: 'select' })
```

---

### `disable()`

Disable interaction mode. Hides action buttons and disables interactions.

```js
interactPlugin.disable()
```

---

### `clear()`

Clear the current selection or marker.

```js
interactPlugin.clear()
```

---

### `selectFeature(featureInfo)`

Programmatically select a feature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `featureInfo.featureId` | `string` | The feature's identifier value |
| `featureInfo.layerId` | `string` | Optional. The layer the feature belongs to |
| `featureInfo.idProperty` | `string` | Optional. The property name used as the identifier |

```js
interactPlugin.selectFeature({
  featureId: 'abc123',
  layerId: 'my-layer',
  idProperty: 'id'
})
```

Respects the current `multiSelect` setting — if `multiSelect` is `false`, the new feature replaces the existing selection.

---

### `unselectFeature(featureInfo)`

Programmatically unselect a specific feature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `featureInfo.featureId` | `string` | The feature's identifier value |
| `featureInfo.layerId` | `string` | Optional. The layer the feature belongs to |
| `featureInfo.idProperty` | `string` | Optional. The property name used as the identifier |

```js
interactPlugin.unselectFeature({
  featureId: 'abc123'
})
```

---

## Events

Subscribe to events using `interactiveMap.on()`.

---

### `interact:done`

Emitted when the user confirms their selection (clicks "Done").

**Payload:**
```js
{
  // If a marker was placed:
  coords: [lng, lat],

  // If features were selected:
  selectedFeatures: [...],
  selectionBounds: [west, south, east, north]
}
```

```js
interactiveMap.on('interact:done', (e) => {
  if (e.coords) {
    console.log('Location selected:', e.coords)
  }
  if (e.selectedFeatures) {
    console.log('Features selected:', e.selectedFeatures)
  }
})
```

---

### `interact:cancel`

Emitted when the user cancels the interaction (clicks "Back").

**Payload:** None

```js
interactiveMap.on('interact:cancel', () => {
  console.log('Interaction cancelled')
})
```

---

### `interact:selectionchange`

Emitted whenever the feature selection changes.

**Payload:**
```js
{
  selectedFeatures: [
    { featureId: '...', layerId: '...', properties: {...}, geometry: {...} }
  ],
  selectionBounds: [west, south, east, north] | null,
  canMerge: boolean,  // true when all selected features are contiguous
  canSplit: boolean   // true when exactly one Polygon or MultiPolygon is selected
}
```

```js
interactiveMap.on('interact:selectionchange', (e) => {
  console.log('Selected features:', e.selectedFeatures)
  console.log('Bounds:', e.selectionBounds)
})
```

---

### `interact:markerchange`

Emitted when a location marker is placed or moved.

**Payload:**
```js
{
  coords: [lng, lat]
}
```

```js
interactiveMap.on('interact:markerchange', ({ coords }) => {
  console.log('Marker moved to:', coords)
})
```
