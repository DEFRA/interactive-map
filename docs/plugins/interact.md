# Interact Plugin

Select features or place markers on the map. The interact plugin provides a unified way to handle user interactions for selecting map features or placing location markers.

## Usage

```js
import createInteractPlugin from '@defra/interactive-map/plugins/interact'

const interactPlugin = createInteractPlugin()

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

## Methods

Methods are called on the plugin instance after the map is ready.

---

### `enable()`

Enable interaction mode. Shows action buttons and enables feature selection or marker placement.

```js
interactiveMap.on('map:ready', () => {
  interactPlugin.enable()
})
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

### `selectFeature(feature)`

Programmatically select a feature.

| Parameter | Type | Description |
|-----------|------|-------------|
| `feature` | `Object` | Feature object to select |

```js
interactPlugin.selectFeature({ id: 'feature-1', bounds: [...] })
```

---

### `unselectFeature()`

Clear the currently selected feature.

```js
interactPlugin.unselectFeature()
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
  marker: { coords: [lng, lat] } | null,
  selection: { bounds: [...], feature: {...} } | null
}
```

```js
interactiveMap.on('interact:done', ({ marker, selection }) => {
  if (marker) {
    console.log('Location selected:', marker.coords)
  }
  if (selection) {
    console.log('Feature selected:', selection.feature)
  }
})
```

---

### `interact:cancel`

Emitted when the user cancels the interaction.

**Payload:** None

```js
interactiveMap.on('interact:cancel', () => {
  console.log('Interaction cancelled')
})
```

---

### `interact:markerchange`

Emitted when the marker position changes.

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

---

### `interact:selectionchange`

Emitted when the feature selection changes.

**Payload:**
```js
{
  bounds: [west, south, east, north],
  feature: { ... }
}
```

```js
interactiveMap.on('interact:selectionchange', ({ bounds, feature }) => {
  console.log('Selection changed:', feature)
})
```

---

### `interact:selectFeature`

Emitted when a feature is programmatically selected via the API.

**Payload:**
```js
{
  feature: { ... }
}
```

---

### `interact:unselectFeature`

Emitted when a feature is programmatically unselected via the API.

**Payload:**
```js
{
  feature: { ... }
}
```
