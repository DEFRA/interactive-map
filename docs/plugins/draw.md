# Draw Plugin

The draw plugin lets users draw and edit polygon and line features on the map — placing vertices by click, tap, or keyboard, snapping to existing map layers, and validating geometry as it's built. Polygons can also be split and merged. It works identically with both the MapLibre and OpenLayers map providers, determining the correct adapter to use from the `mapProvider` passed to `InteractiveMap` — there's nothing to configure.

## ESM usage

```js
import createDrawPlugin from '@defra/interactive-map/plugins/draw'

const drawPlugin = createDrawPlugin()

const interactiveMap = new InteractiveMap('map', {
  plugins: [drawPlugin]
})

interactiveMap.on('map:ready', () => {
  interactiveMap.addButton('drawPolygon', {
    label: 'Draw polygon',
    onClick: () => drawPlugin.newPolygon(crypto.randomUUID())
  })
})
```

## UMD usage

Copy the entire `plugins/draw/dist/umd/` directory to `/your-assets-path/plugins/draw/umd/`. The plugin uses dynamic imports to load MapLibre or OpenLayers support on demand, so all files in the directory must be served from the same location. Then add the script tag:

```html
<script defer src="/your-assets-path/plugins/draw/umd/index.js"></script>
```

```js
const drawPlugin = defra.drawPlugin()

const interactiveMap = new defra.InteractiveMap('map', {
  mapProvider: defra.maplibreProvider(),
  plugins: [drawPlugin]
})
```

> [!NOTE]
> **GOV.UK Prototype Kit** — skip the copy step. All files are served automatically. Use this path instead:
> ```html
> <script defer src="/plugin-assets/%40defra%2Finteractive-map/plugins/draw/dist/umd/index.js"></script>
> ```

## Options

Options are passed to the factory function when creating the plugin.

---

### `snapLayers`

**Type:** `string[]`

Vector tile source-layer names to snap new and edited vertices against. Can be overridden per call — see `newPolygon`, `newLine`, `editFeature`, and `split` below.

The layer names available depend entirely on your basemap style — there's no universal default, so check your style's vector tile source(s) for the source-layer names to use. The example below (`'OS/TopographicArea_1/Agricultural Land'`) is specific to an Ordnance Survey basemap style.

When set (globally or per call), a "Snap to feature" toggle appears in the draw menu, letting the user turn snapping on and off during a session.

```js
createDrawPlugin({
  snapLayers: ['OS/TopographicArea_1/Agricultural Land', 'OS/TopographicLine/Building Outline']
})
```

---

### `onGeometryChange`

**Type:** `Function`

Plugin-level validation callback, called throughout the draw/edit lifecycle so you can enforce your own rules (e.g. "shapes must stay inside a boundary") alongside the built-in ones. Can be overridden per call — see [Validation](#validation) below for the full contract, and `newPolygon`, `newLine`, `editFeature` for the per-call override.

---

### `includeModes`

**Type:** `string[]`

When set, the plugin only initialises when the app is in one of the specified modes.

---

### `excludeModes`

**Type:** `string[]`

When set, the plugin does not initialise when the app is in one of the specified modes.

---

### Colour and size overrides

> [!NOTE]
> Each colour accepts a plain colour string or a style-keyed object (e.g. `{ light: '#1d70b8', dark: '#ffffff' }`).

| Property | Type | Description |
|----------|------|-------------|
| `shapeStroke` | `string \| Record<string, string>` | Default stroke colour for an inactive (not being drawn/edited) shape, when the feature sets no `stroke` of its own |
| `shapeFill` | `string \| Record<string, string>` | Default fill colour for an inactive shape, when the feature sets no `fill` of its own |
| `strokeWidth` | `number` | Default stroke width in pixels. **Default:** `2` |
| `editStroke` | `string \| Record<string, string>` | Stroke colour of the shape currently being drawn or edited |
| `editFill` | `string \| Record<string, string>` | Fill colour of the shape currently being drawn or edited |
| `editVertex` | `string \| Record<string, string>` | Colour of placed, unselected vertex handles |
| `editMidpoint` | `string \| Record<string, string>` | Colour of the midpoint handles used to insert a new vertex on an edge |
| `editActive` | `string \| Record<string, string>` | Colour of the currently selected/active vertex handle |
| `editHalo` | `string \| Record<string, string>` | Colour of the halo drawn behind vertex/midpoint handles for contrast |
| `invalidStroke` | `string \| Record<string, string>` | Stroke colour of the dashed outline shown while the shape fails validation |
| `splitValid` | `string \| Record<string, string>` | Colour of the split line while it would produce a valid split |
| `splitInvalid` | `string \| Record<string, string>` | Colour of the split line while it would not produce a valid split |
| `snapVertex` | `string \| Record<string, string>` | Colour of the snap indicator shown over a vertex |
| `snapEdge` | `string \| Record<string, string>` | Colour of the snap indicator shown over an edge |
| `snapRadius` | `number` | Snap tolerance in pixels. **Default:** `12` |

```js
createDrawPlugin({
  shapeStroke: { light: '#1d70b8', dark: '#5694ca' },
  editStroke: '#0b0c0c',
  strokeWidth: 3,
  snapRadius: 16
})
```

## Validation

Every geometry change — placing a vertex, dragging one, finishing a shape — is checked against a set of built-in rules before it's accepted, plus your own `onGeometryChange` callback if you provide one.

### Built-in rules

| Rule | Applies to | Behaviour |
|------|-----------|-----------|
| Minimum vertices | Polygon (3), Line (2) | Gates the Done button — a shape below the minimum can't be finished |
| Self-intersection | Polygon | Gates the Done button — a self-crossing shape can't be finished |
| Self-intersection (placement) | Polygon | Rejects a vertex placement outright if it would make the drawn path cross itself — the vertex never appears |
| Non-zero area | Polygon | Gates the Done button — a collinear/degenerate ring can't be finished |

Rule failures gate the Done button (the shape can pass through interim invalid states while being built or reshaped, shown with a dashed outline) except the placement-time self-intersection check, which is a hard veto — that specific vertex is rejected and never placed.

### `onGeometryChange` callback

Set at the plugin level (`createDrawPlugin({ onGeometryChange })`) or per call (`newPolygon`/`newLine`/`editFeature`'s `options.onGeometryChange`, which takes precedence when given). Not used by `split` (which validates that the line actually bisects the shape) or `merge`/`addFeature` (no validation).

**Signature:** `onGeometryChange(event) => boolean | { valid: boolean, reason?: string } | undefined`

| Return value | Meaning |
|---|---|
| `true` / `undefined` | Valid |
| `false` | Invalid, no reason shown |
| `{ valid, reason }` | Valid or invalid, with an optional reason surfaced as a hint toast (except for placement, which never toasts — see `phase` below) |

**Event payload:**

| Property | Type | Description |
|----------|------|-------------|
| `feature` | `GeoJSON.Feature` | The shape at this point — the in-progress feature during `'preview'`, the committed/candidate feature at every other phase |
| `phase` | `string` | See table below |
| `mode` | `'draw_polygon' \| 'draw_line' \| 'edit_vertex'` | The active draw mode |
| `vertexIndex` | `number` | Index of the vertex being placed/added/moved/inserted/deleted. Present on `'place'` and every `'commit-*'` phase |
| `numVertices` | `number` | Count of already-committed vertices, excluding any in-progress cursor point. Present on every `'preview'` call |

**Phases:**

| Phase | When | Can veto? |
|-------|------|-----------|
| `'preview'` | Live feedback on every rubber-band move while drawing/dragging, throttled to once per frame. Drives both the dashed-outline check and the Add-point button | No — display only |
| `'place'` | A real click/tap/Add-point press, evaluated once, synchronously | Yes — a hard rule or your callback returning invalid rejects the vertex outright; it never appears |
| `'create'` | A whole new feature just finished being drawn | Gates whether it's accepted as-is or reopened in edit mode |
| `'edit-start'` | An existing feature was just loaded into an edit session — the baseline check before anything has changed | Gates the initial Done state |
| `'commit-add'` | A vertex was added while drawing | Gates Done |
| `'commit-move'` | A vertex was dragged/nudged while editing | Gates Done |
| `'commit-insert'` | A vertex was inserted at a midpoint while editing | Gates Done |
| `'commit-delete'` | A vertex was removed while editing | Gates Done |

```js
createDrawPlugin({
  onGeometryChange: (event) => ({
    valid: isEastOfWalesBorder(event.feature.geometry),
    reason: 'Points must be placed east of the England/Wales border'
  })
})
```

## Methods

Methods are called on the plugin instance. `newPolygon`, `newLine`, `editFeature`, `addFeature`, `deleteFeature`, `split`, and `merge` all need `mapProvider.draw` to be ready — call them after [`draw:ready`](#drawready).

---

### `newPolygon(featureId, options?)`

Start drawing a new polygon.

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID to assign the finished feature |
| `options.snapLayers` | `string[]` | Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryChange` | `Function` | Overrides the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |
| `options.stroke` | `string \| Record<string, string>` | Stroke colour for this shape |
| `options.fill` | `string \| Record<string, string>` | Fill colour for this shape |
| `options.strokeWidth` | `number` | Stroke width in pixels for this shape |
| `options.properties` | `Object` | Custom GeoJSON properties to set on the finished feature |

```js
drawPlugin.newPolygon(crypto.randomUUID(), {
  stroke: '#e6c700',
  fill: 'rgba(255, 221, 0, 0.1)'
})
```

---

### `newLine(featureId, options?)`

Start drawing a new line. Same options as `newPolygon`.

```js
drawPlugin.newLine(crypto.randomUUID(), {
  stroke: { outdoor: '#99704a', dark: '#ffffff' },
  strokeWidth: 6
})
```

---

### `editFeature(featureId, options?)`

Open an existing feature in vertex-edit mode. Returns `false` (without doing anything) if the feature doesn't exist or the plugin isn't ready yet — check the return value before assuming the edit session started.

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID of the feature to edit |
| `options.snapLayers` | `string[]` | Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryChange` | `Function` | Overrides the plugin-level `onGeometryChange` for this session |

```js
const editSuccess = drawPlugin.editFeature(selectedFeatureId)
if (!editSuccess) {
  return
}
```

---

### `addFeature(feature)`

Add a feature directly to the map without a draw session — e.g. loading in existing shapes on `draw:ready`.

| Argument | Type | Description |
|----------|------|-------------|
| `feature.id` | `string` | **Required.** Feature ID |
| `feature.geometry` | `GeoJSON.Geometry` | **Required.** `Polygon` or `LineString` geometry |
| `feature.stroke` | `string \| Record<string, string>` | Stroke colour |
| `feature.fill` | `string \| Record<string, string>` | Fill colour |
| `feature.strokeWidth` | `number` | Stroke width in pixels |
| `feature.properties` | `Object` | Custom GeoJSON properties |

```js
interactiveMap.on('draw:ready', () => {
  drawPlugin.addFeature({
    id: 'test1234',
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [[[-2.879, 54.709], [-2.877, 54.708], [-2.875, 54.708], [-2.879, 54.709]]] },
    stroke: 'rgba(0,112,60,1)',
    fill: 'rgba(0,112,60,0.2)',
    strokeWidth: 2
  })
})
```

---

### `deleteFeature(featureIds)`

Remove one or more features from the map.

| Argument | Type | Description |
|----------|------|-------------|
| `featureIds` | `string[]` | IDs of the features to remove |

```js
drawPlugin.deleteFeature(['test1234'])
```

---

### `split(featureId, options?)`

Start drawing a line across a polygon to split it in two. Splitting is a pure computation — it does not remove the original feature or add the results itself. Listen for [`draw:split`](#drawsplit) and call `deleteFeature`/`addFeature` yourself.

Always snaps to the polygon's own outline, in addition to any layers in `snapLayers`.

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID of the polygon to split |
| `options.snapLayers` | `string[]` | Additional layers to snap against, on top of the polygon's own outline |

```js
drawPlugin.split(selectedFeatureId)

interactiveMap.on('draw:split', (e) => {
  drawPlugin.deleteFeature([e.originalFeatureId])
  e.featureCollection.features.forEach((feature, index) => {
    drawPlugin.addFeature({
      id: `${e.originalFeatureId}-${index === 0 ? 'a' : 'b'}`,
      type: feature.type,
      geometry: feature.geometry,
      properties: feature.properties
    })
  })
})
```

---

### `merge(featureIds)`

Merge multiple contiguous polygons into one. Like `split`, this is a pure computation — it does not touch the map. Listen for the return value or [`draw:merge`](#drawmerge) and call `deleteFeature`/`addFeature` yourself.

| Argument | Type | Description |
|----------|------|-------------|
| `featureIds` | `string[]` | IDs of the polygons to merge |

**Returns:** the merged GeoJSON feature, or `null` if the merge failed (e.g. the polygons aren't actually contiguous).

```js
drawPlugin.merge(selectedFeatureIds)

interactiveMap.on('draw:merge', (e) => {
  drawPlugin.deleteFeature(e.originalFeatureIds)
  drawPlugin.addFeature({
    id: e.originalFeatureIds[0],
    type: e.feature.type,
    geometry: e.feature.geometry,
    properties: e.feature.properties
  })
})
```

## Buttons and keyboard shortcuts

The plugin registers its own toolbar buttons automatically — Cancel, Add point (touch only), Done, and a Draw actions menu (Undo, Snap to feature, Delete point) — which show and enable themselves based on the current draw/edit state. You don't need to render these yourself; augment them with your own trigger buttons (e.g. "Draw polygon", "Draw line") the way the [Draw tools example](../examples/draw-tools.mdx) does.

| Shortcut | Action |
|----------|--------|
| <kbd>Enter</kbd> | Add point (draw) |
| <kbd>Spacebar</kbd> | Select nearest point (edit) |
| <kbd>Alt</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>←</kbd>/<kbd>→</kbd> | Select adjacent point (edit) |
| <kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>←</kbd>/<kbd>→</kbd> | Move point (edit) |
| <kbd>Shift</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>←</kbd>/<kbd>→</kbd> | Nudge point, fine step (edit) |
| <kbd>Delete</kbd> | Delete point (edit) |
| <kbd>Command</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo |

A selected edit vertex also claims the map's [`enableMoveControl`](../api.md#enablemovecontrol) D-pad, if enabled, so it can be nudged with the on-screen directional buttons as well as the keyboard.

## Events

Subscribe to events using `interactiveMap.on()`.

---

### `draw:ready`

Emitted once the draw plugin has initialised. Safe to call API methods from here.

**Payload:** None

---

### `draw:started`

Emitted when `newPolygon` or `newLine` starts a new draw session.

**Payload:** `{ mode: 'draw_polygon' | 'draw_line' }`

---

### `draw:editstart`

Emitted when `editFeature` opens an existing feature for editing.

**Payload:** `{ mode: 'edit_polygon' | 'edit_line' }`

---

### `draw:created`

Emitted when a new shape finishes drawing and passes validation. Also fires for a shape that finished invalid, was automatically reopened in edit mode, and was then fixed and finished — from the caller's perspective it's still a creation, not an edit.

**Payload:** the finished `GeoJSON.Feature`

---

### `draw:edited`

Emitted when an existing feature finishes an edit session (via `editFeature`).

**Payload:** the edited `GeoJSON.Feature`

---

### `draw:cancelled`

Emitted when the Cancel button is pressed during a draw or edit session.

**Payload:** the feature being drawn/edited at the time of cancellation

---

### `draw:updated`

Emitted after a committed vertex operation (add/move/insert/delete) while editing.

**Payload:** the updated `GeoJSON.Feature`

---

### `draw:vertexselection`

Emitted when the selected vertex changes in edit mode.

**Payload:** `{ index: number, numVertices: number }` — `index` is `-1` when nothing is selected

---

### `draw:interfacetypechange`

Emitted when the input device changes mid-session (e.g. switching from mouse to touch and panning via the Move control) — sync your own `interfaceType` state from this if you're tracking it independently.

**Payload:** `{ interfaceType: 'mouse' | 'touch' | 'keyboard' }`

---

### `draw:geometryinvalid`

Emitted whenever a validation check — a built-in rule or your `onGeometryChange` callback — fails, alongside the same hint toast shown to the user (skipped only for an in-progress shape that simply hasn't reached its minimum vertex count yet). See [Validation](#validation).

**Payload:** `{ feature, reason, phase, mode, vertexIndex? }`

---

### `draw:add`

Emitted after `addFeature` adds a feature to the map.

**Payload:** the added `GeoJSON.Feature`

---

### `draw:delete`

Emitted after `deleteFeature` removes a feature.

**Payload:** `{ featureId: string }`

---

### `draw:split`

Emitted when `split` computes a successful split.

**Payload:** `{ originalFeatureId: string, featureCollection: GeoJSON.FeatureCollection }` — the two resulting polygons

---

### `draw:merge`

Emitted when `merge` computes a successful merge.

**Payload:** `{ originalFeatureIds: string[], feature: GeoJSON.Feature }` — the single merged polygon

```js
interactiveMap.on('draw:created', (feature) => {
  console.log('New feature drawn:', feature.id)
})

interactiveMap.on('draw:geometryinvalid', ({ reason }) => {
  console.log('Validation failed:', reason)
})
```
