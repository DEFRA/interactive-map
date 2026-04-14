# Interact Plugin

The interact plugin provides a unified way to handle user interactions for selecting map features or placing location markers.

## Usage

```js
import createInteractPlugin from '@defra/interactive-map/plugins/interact'

const interactPlugin = createInteractPlugin({
  interactionModes: ['selectMarker', 'selectFeature'],
  multiSelect: true,
  layers: [
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

### `interactionModes`
**Type:** `Array<'selectMarker' | 'selectFeature' | 'placeMarker'>`
**Default:** `['selectMarker']`

Controls which interactions are active when the user clicks the map. Values can be combined freely — the plugin always processes them in a fixed priority order: marker selection → feature selection → place marker.

- `'selectMarker'` — clicking a placed marker toggles its selection state
- `'selectFeature'` — clicking the map attempts to match a feature from `layers`
- `'placeMarker'` — if no feature is matched (or `selectFeature` is not active), places a location marker at the clicked coordinates

**Common combinations:**

```js
interactionModes: ['selectMarker']                              // marker selection only (default)
interactionModes: ['selectFeature']                             // feature selection only
interactionModes: ['placeMarker']                               // always place a marker on click
interactionModes: ['selectMarker', 'selectFeature']             // select markers or features
interactionModes: ['selectFeature', 'placeMarker']              // select features, fall back to placing a marker
interactionModes: ['selectMarker', 'selectFeature', 'placeMarker'] // all interactions active
```

---

### `layers`
**Type:** `Array<LayerConfig>`
**Default:** `[]`

Array of map layer configurations that are selectable. Each entry specifies which layer to watch and how to identify features.

```js
layers: [
  { layerId: 'my-polygons', idProperty: 'guid' },
  { layerId: 'my-lines' }
]
```

#### `LayerConfig` properties

| Property | Type | Description |
|----------|------|-------------|
| `layerId` | `string` | **Required.** The map layer identifier to enable selection on |
| `idProperty` | `string` | Property name used as the feature's unique identifier. If omitted, features are matched by index |
| `selectedStroke` | `string` | Overrides the selection stroke colour for this layer. Defaults to `MapStyleConfig.selectedColor` |
| `selectedFill` | `string` | Overrides the selection fill colour for this layer. Defaults to `transparent` |
| `selectedStrokeWidth` | `number` | Overrides the selection stroke width for this layer. Defaults to `3` |

#### Finding layer IDs

What to use as `layerId` depends on how your data is added to the map — these are the layers the plugin will enable for feature selection:

- **Map provider directly** — use the layer IDs defined in your style or added via your map provider's layer API
- **Datasets plugin** — use the dataset ID, or the sublayer ID for datasets with sublayers
- **Draw plugin** — uses generated layer IDs; inspect the map at runtime to find them (e.g. `fill-inactive.cold`, `stroke-inactive.cold` when using MapLibre)

If you're unsure of the layer IDs available at runtime, set `debug: true` in the interact plugin options — this lets you query the map and inspect layer names in the browser console.

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

When `true`, clicking outside any selectable feature clears the current selection.

---

### `tolerance`
**Type:** `number`
**Default:** `10`

Click detection radius in pixels applied to line features. Lines have a 1px rendered width so a buffer is required for reliable selection. Polygon and symbol/icon features use exact hit detection and are unaffected by this value.

---

### `closeOnAction`
**Type:** `boolean`
**Default:** `true`

When `true`, the app closes after the user clicks "Done" or "Cancel".

---

### `marker`
**Type:** `MarkerOptions`

Appearance of the location marker placed on the map. Accepts the same properties as [`MarkerOptions`](../api/marker-config.md#markeroptions). See [Symbol Config](../api/symbol-config.md) for the full property reference.

```js
createInteractPlugin({
  marker: {
    symbol: 'pin',
    backgroundColor: { outdoor: '#d4351c', dark: '#ff6b6b' },
    foregroundColor: '#ffffff'
  }
})
```

When not set, the marker inherits from the constructor `symbolDefaults` cascade.

---

### `selectedStrokeWidth`
**Type:** `number`
**Default:** `3`

Stroke width used to highlight selected features. Can be overridden per layer via `layers[].selectedStrokeWidth`.

> **Selection colours** — stroke and fill colours for selected features are not configured here. Stroke colour comes from `MapStyleConfig.selectedColor` (falling back to the `mapColorScheme` scheme default), ensuring the selection colour stays consistent with the rest of the map theme. Fill defaults to `transparent`. Both can be overridden per layer via `layers[].selectedStroke` and `layers[].selectedFill`.

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
interactPlugin.enable({ multiSelect: true, interactionModes: ['selectFeature'] })
```

---

### `disable()`

Disable interaction mode. Hides action buttons and disables interactions.

```js
interactPlugin.disable()
```

---

### `clear()`

Clear all selected features and markers, and remove the location marker.

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

### `selectMarker(markerId)`

Programmatically select a marker. Idempotent — has no effect if the marker is already selected. In single-select mode, clears any selected features and replaces the marker selection. In multi-select mode, adds to the existing selection.

| Parameter | Type | Description |
|-----------|------|-------------|
| `markerId` | `string` | The ID of the marker to select |

```js
interactPlugin.selectMarker('my-marker')
```

---

### `unselectMarker(markerId)`

Programmatically unselect a specific marker. Idempotent — has no effect if the marker is not selected.

| Parameter | Type | Description |
|-----------|------|-------------|
| `markerId` | `string` | The ID of the marker to unselect |

```js
interactPlugin.unselectMarker('my-marker')
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
  // If a location marker was placed:
  coords: [lng, lat],

  // If features were selected:
  selectedFeatures: [...],
  selectionBounds: [west, south, east, north],

  // If markers were selected:
  selectedMarkers: ['...']
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
  if (e.selectedMarkers) {
    console.log('Markers selected:', e.selectedMarkers)
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

Emitted whenever the selected features or selected markers change.

**Payload:**
```js
{
  selectedFeatures: [
    { featureId: '...', layerId: '...', properties: {...}, geometry: {...} }
  ],
  selectedMarkers: ['...'],  // array of selected marker IDs
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
