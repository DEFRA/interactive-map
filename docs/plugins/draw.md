# Draw Plugin

The draw plugin lets users draw and edit point, polygon and line features on the map — placing vertices by click, tap, or keyboard, snapping to existing map layers, and validating geometry as it's built. Polygons can also be split and merged.

It works the same with `@defra/interactive-map` (MapLibre) and `@defra/interactive-map-openlayers`.

> [!NOTE]
> `@defra/interactive-map-esri` has a separate draw plugin, imported the same way, with limited features. It only draws and edits polygons, and doesn't support the options, validation or most of the methods below.

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

Copy the entire `plugins/draw/dist/umd/` directory to `/your-assets-path/plugins/draw/umd/`. The plugin loads the rest of its files when it's used, so all files in the directory must be served from the same location. Then add the script tag:

```html
<script defer src="/your-assets-path/plugins/draw/umd/index.js"></script>
```

```js
const drawPlugin = defra.drawPlugin()

const interactiveMap = new defra.InteractiveMap('map', {
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

Vector tile source-layer names to snap new and edited vertices against. Can be overridden per call — see `newPolygon`, `newLine`, `newPoint`, `editFeature`, and `split` below.

The layer names available depend entirely on your basemap style — there's no universal default, so check your style's vector tile source(s) for the source-layer names to use. The example below (`'OS/TopographicArea_1/Agricultural Land'`) is specific to an Ordnance Survey basemap style.

When set (globally or per call), a "Snap" toggle button appears in the top row, letting the user turn snapping on and off during a session.

```js
createDrawPlugin({
  snapLayers: ['OS/TopographicArea_1/Agricultural Land', 'OS/TopographicLine/Building Outline']
})
```

---

### `onGeometryPreview`

**Type:** `Function`

Plugin-level synchronous check, called while a shape is drawn or dragged and when a vertex is about to be placed. Can be overridden per call. See [`onGeometryPreview`](#ongeometrypreviewevent).

---

### `onGeometryChange`

**Type:** `Function`

Plugin-level check, called after each committed change to a shape. Can return a Promise, so the shape can be checked against a service. Can be overridden per call. See [`onGeometryChange`](#ongeometrychangeevent-context).

---

### `onGeometryFinish`

**Type:** `Function`

Plugin-level check, called when a shape is finished. Can return a Promise. Can be overridden per call. See [`onGeometryFinish`](#ongeometryfinishevent-context).

---

### Colour and size overrides

> [!NOTE]
> Each colour accepts a plain colour string or a style-keyed object (e.g. `{ light: '#1d70b8', dark: '#ffffff' }`).

| Property | Description |
|----------|-------------|
| `shapeStroke` | **Type:** `string \| Record<string, string>`<br />Default stroke colour for an inactive (not being drawn/edited) shape, when the feature sets no `stroke` of its own |
| `shapeFill` | **Type:** `string \| Record<string, string>`<br />Default fill colour for an inactive shape, when the feature sets no `fill` of its own |
| `strokeWidth` | **Type:** `number`<br />**Default:** `2`<br />Default stroke width in pixels |
| `editStroke` | **Type:** `string \| Record<string, string>`<br />Stroke colour of the shape currently being drawn or edited |
| `editFill` | **Type:** `string \| Record<string, string>`<br />Fill colour of the shape currently being drawn or edited |
| `editVertex` | **Type:** `string \| Record<string, string>`<br />Colour of placed, unselected vertex handles |
| `editMidpoint` | **Type:** `string \| Record<string, string>`<br />Colour of the midpoint handles used to insert a new vertex on an edge |
| `editActive` | **Type:** `string \| Record<string, string>`<br />Colour of the currently selected/active vertex handle |
| `editHalo` | **Type:** `string \| Record<string, string>`<br />Colour of the halo drawn behind vertex/midpoint handles for contrast |
| `invalidStroke` | **Type:** `string \| Record<string, string>`<br />Stroke colour of the dashed outline shown while the shape fails validation |
| `splitValid` | **Type:** `string \| Record<string, string>`<br />Colour of the split line while it would produce a valid split |
| `splitInvalid` | **Type:** `string \| Record<string, string>`<br />Colour of the split line while it would not produce a valid split |
| `snapVertex` | **Type:** `string \| Record<string, string>`<br />Colour of the snap indicator shown over a vertex |
| `snapEdge` | **Type:** `string \| Record<string, string>`<br />Colour of the snap indicator shown over an edge |
| `snapRadius` | **Type:** `number`<br />**Default:** `12`<br />Snap tolerance in pixels |

```js
createDrawPlugin({
  shapeStroke: { light: '#1d70b8', dark: '#5694ca' },
  editStroke: '#0b0c0c',
  strokeWidth: 3,
  snapRadius: 16
})
```

## Validation

Every change is checked against the built-in rules, then against your own callbacks if you set them.

### Built-in rules

| Rule | Description |
|------|-------------|
| Minimum vertices | A polygon needs 3 vertices and a line 2 before it can be finished |
| Self-intersection | A polygon that crosses itself can't be finished. A vertex that would make the drawn path cross itself is rejected and never placed |
| Non-zero area | A flat polygon, with all its vertices in a line, can't be finished |

While a rule fails, the shape has a dashed outline.

### Callbacks

| Callback | Description |
|----------|-------------|
| [`onGeometryPreview`](#ongeometrypreviewevent) | Live checks while a shape is drawn or dragged, and before a vertex is placed. Must answer straight away |
| [`onGeometryChange`](#ongeometrychangeevent-context) | After each change. Can return a Promise. The latest result enables or disables Done |
| [`onGeometryFinish`](#ongeometryfinishevent-context) | When a shape is finished. Can return a Promise. Decides whether the shape is created, or the edit finishes |

#### Setting the callbacks

Set them at plugin level, `createDrawPlugin({ onGeometryPreview, onGeometryChange, onGeometryFinish })`, or per call in the options of `newPolygon`, `newLine`, `newPoint` and `editFeature`. Each per-call callback replaces only its plugin-level equivalent for that session. The others still apply. To do more than one thing on a change, call each from one callback.

They aren't used by `split`, `merge`, `addFeature` or `setStyle`.

#### What they return

| Value | Description |
|-------|-------------|
| `true` | Valid |
| `undefined` | Valid |
| `false` | Invalid, with no reason shown |
| `result.valid` | Whether the shape is valid |
| `result.reason` | Why the shape is invalid. Shown as a hint and sent with [`draw:geometryinvalid`](#drawgeometryinvalid) |
| `result.announcement` | Read out by screen readers instead of draw's own message. When it's set, `reason` isn't shown as a hint, so you can show it yourself. From `onGeometryPreview`, it's only read out for a rejected vertex |

#### What they receive

| Property | Description |
|----------|-------------|
| `event.feature` | The shape being checked, as a GeoJSON feature |
| `event.phase` | Why the callback was called. See each callback below |
| `event.mode` | The draw mode: `'draw_polygon'`, `'draw_line'`, `'draw_point'`, `'edit_vertex'` or `'edit_point'` |
| `event.vertexIndex` | The vertex being placed or changed. Only on `'place'`, and on a `'change'` to a single vertex |
| `event.numVertices` | How many vertices have been placed, not counting the one following the pointer. Only on `'preview'` |
| `event.detail` | The `detail` passed to [`recheckGeometry`](#recheckgeometrydetail). Only on `'recheck'` |
| `context.signal` | An `AbortSignal`, aborted when a newer check starts or the session ends. Pass it to `fetch` to cancel the request. Not passed to `onGeometryPreview` |
| `context.revision` | A number that increases with every check. Not passed to `onGeometryPreview` |

#### Debouncing

Debouncing and timeouts are up to you. Waiting on `signal` gives a debounce that cancels itself when the shape changes again:

```js
const wait = (ms, signal) => new Promise((resolve, reject) => {
  const timer = setTimeout(resolve, ms)
  signal.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason) }, { once: true })
})

createDrawPlugin({
  onGeometryPreview: (event) => ({
    valid: isEastOfWalesBorder(event.feature.geometry),
    reason: 'Points must be placed east of the England/Wales border'
  }),
  onGeometryChange: async ({ feature }, { signal }) => {
    infoPanel.update(measureArea(feature))
    await wait(300, signal)
    const response = await fetch('/api/boundary-checks', { method: 'POST', body: JSON.stringify(feature), signal })
    return response.json() // { valid, reason }
  }
})
```

## `onGeometryPreview(event)`

**Signature:** `onGeometryPreview(event) => result`

Must answer straight away. A Promise counts as valid. It runs on every frame of a drag, so keep it quick.

| Phase | When |
|-------|------|
| `'preview'` | While a shape is drawn or dragged. Drives the dashed outline and the Add point button. While editing, it also enables or disables Done |
| `'place'` | Before a vertex is placed by a click, tap, <kbd>Enter</kbd> or Add point. An invalid result rejects the vertex |

Use it for rules about a single vertex, such as where the first point can go. `onGeometryChange` isn't called until the shape has its minimum number of vertices.

## `onGeometryChange(event, context)`

**Signature:** `onGeometryChange(event, context) => result | Promise<result>`

Called after each change to a shape.

| Phase | When |
|-------|------|
| `'change'` | The shape changed, including with [`setGeometry`](#setgeometrygeometry) or undo |
| `'edit-start'` | `editFeature` opened the shape |
| `'recheck'` | [`recheckGeometry`](#recheckgeometrydetail) was called |
| `'create'` | Only without `onGeometryFinish`. A new shape was finished without a passing result, such as a new point |
| `'edit-finish'` | Only without `onGeometryFinish`, when the last result set `recheckOnFinish`. Done was pressed on an edit |

It's only called once the built-in rules pass, and only the result for the latest change counts. If it fails, throws or rejects, the shape can't be finished: call `recheckGeometry()` to retry. If the shape is finished while a check is running, draw waits for the result.

## `onGeometryFinish(event, context)`

**Signature:** `onGeometryFinish(event, context) => result | Promise<result>`

Called when a shape is finished, to check the whole shape once. Without it, finishing uses the latest `onGeometryChange` result. If `onGeometryChange` already checks the shape with your service, you don't need `onGeometryFinish`.

| Phase | When |
|-------|------|
| `'create'` | A new shape or point was finished |
| `'edit-finish'` | Done was pressed on an edit |

Draw waits for the result. A new shape that fails reopens in edit mode ([`draw:reopened`](#drawreopened)), where Undo starts empty and Cancel discards it. An edit that fails stays open. If the latest `onGeometryChange` result failed, the shape can't be finished, so `onGeometryFinish` isn't called.

This updates a panel on every change, and validates the shape once it's finished:

```js
createDrawPlugin({
  // Returns nothing, so every change counts as valid
  onGeometryChange: ({ feature }, { signal }) => {
    contextPanel.update(feature, { signal })
  },
  onGeometryFinish: ({ feature }, { signal }) => validateWithService(feature, { signal })
})
```

Don't `await` the panel update. `onGeometryChange` would then be pending until the panel replies, and finishing would wait for it.

## Methods

Methods are called on the plugin instance. `newPolygon`, `newLine`, `newPoint`, `editFeature`, `addFeature`, `setStyle`, `deleteFeature`, `split`, `merge`, `setGeometry` and `recheckGeometry` all need `mapProvider.draw` to be ready — call them after [`draw:ready`](#drawready).

---

### `newPolygon(featureId, options?)`

Start drawing a new polygon.

| Argument | Description |
|----------|-------------|
| `featureId` | **Type:** `string`<br />**Required**<br />ID to assign the finished feature |
| `options.snapLayers` | **Type:** `string[]`<br />Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryPreview` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryPreview` for this session — see [Validation](#validation) |
| `options.onGeometryChange` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |
| `options.onGeometryFinish` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryFinish` for this session — see [Validation](#validation) |
| `options.stroke` | **Type:** `string \| Record<string, string>`<br />Stroke colour for this shape |
| `options.fill` | **Type:** `string \| Record<string, string>`<br />Fill colour for this shape |
| `options.strokeWidth` | **Type:** `number`<br />Stroke width in pixels for this shape |
| `options.properties` | **Type:** `Object`<br />Custom GeoJSON properties to set on the finished feature |

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

### `newPoint(featureId, options?)`

Start drawing a new point. Unlike `newPolygon`/`newLine`, it commits as soon as a point is placed — there's no Done step.

| Argument | Description |
|----------|-------------|
| `featureId` | **Type:** `string`<br />**Required**<br />ID to assign the finished feature |
| `options.snapLayers` | **Type:** `string[]`<br />Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryPreview` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryPreview` for this session — see [Validation](#validation) |
| `options.onGeometryChange` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |
| `options.onGeometryFinish` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryFinish` for this session — see [Validation](#validation) |
| `options.properties` | **Type:** `Object`<br />Custom GeoJSON properties to set on the finished feature |
| `options.symbol` | **Type:** `string`<br />Built-in symbol id — `'pin'`, `'circle'`, `'square'`, `'hexagon'`, `'triangle'`, or `'diamond'` |
| `options.symbolSvgContent` | **Type:** `string`<br />Custom SVG markup, used instead of `symbol` |
| `options.symbolBackgroundColor` | **Type:** `string \| Record<string, string>`<br />Symbol background colour |
| `options.symbolForegroundColor` | **Type:** `string \| Record<string, string>`<br />Symbol foreground colour |
| `options.symbolGraphic` | **Type:** `string`<br />Overrides the symbol's inner graphic (built-in name or SVG path data) |
| `options.symbolHaloWidth` | **Type:** `number`<br />Symbol halo width |
| `options.symbolViewBox` | **Type:** `string`<br />SVG `viewBox`, for use with `symbolSvgContent` |
| `options.symbolAnchor` | **Type:** `[number, number]`<br />Normalised `[x, y]` anchor point |
| `options.symbolSize` | **Type:** `'small' \| 'medium' \| 'large'`<br />Symbol size — see [Symbol Config](../api/symbol-config.md#size) |

These mirror [MarkerOptions](../api/marker-config.md#markeroptions)' `symbol`-family properties (prefixed with `symbol` here to sit alongside other feature properties) — see [Symbol Config](../api/symbol-config.md) for the full resolution order and SVG token structure. Points with no symbol config render with the plugin's default marker.

```js
drawPlugin.newPoint(crypto.randomUUID(), {
  symbol: 'pin',
  symbolBackgroundColor: { outdoor: '#d4351c', dark: '#ff6b6b' }
})
```

---

### `editFeature(featureId, options?)`

Open an existing feature in edit mode — vertex-edit for a `Polygon`/`LineString`, single-coordinate drag for a `Point`. Returns `false` (without doing anything) if the feature doesn't exist or the plugin isn't ready yet — check the return value before assuming the edit session started.

| Argument | Description |
|----------|-------------|
| `featureId` | **Type:** `string`<br />**Required**<br />ID of the feature to edit |
| `options.snapLayers` | **Type:** `string[]`<br />Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryPreview` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryPreview` for this session — see [Validation](#validation) |
| `options.onGeometryChange` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |
| `options.onGeometryFinish` | **Type:** `Function`<br />Replaces the plugin-level `onGeometryFinish` for this session — see [Validation](#validation) |

```js
const editSuccess = drawPlugin.editFeature(selectedFeatureId)
if (!editSuccess) {
  return
}
```

---

### `addFeature(feature)`

Add a `Point`, `LineString`, or `Polygon` feature directly to the map without a draw session — e.g. loading in existing shapes on `draw:ready`.

| Argument | Description |
|----------|-------------|
| `feature.id` | **Type:** `string`<br />**Required**<br />Feature ID |
| `feature.type` | **Type:** `string`<br />Defaults to `'Feature'` if omitted |
| `feature.geometry` | **Type:** `GeoJSON.Geometry`<br />**Required**<br />`Point`, `LineString`, or `Polygon` geometry |
| `feature.stroke` | **Type:** `string \| Record<string, string>`<br />Stroke colour (`LineString`/`Polygon`) |
| `feature.fill` | **Type:** `string \| Record<string, string>`<br />Fill colour (`Polygon`) |
| `feature.strokeWidth` | **Type:** `number`<br />Stroke width in pixels (`LineString`/`Polygon`) |
| `feature.properties` | **Type:** `Object`<br />Custom GeoJSON properties — a `Point`'s `symbol`-family properties go here (see `newPoint` above) |

A feature with a missing/unsupported `geometry.type` or no `geometry.coordinates` is logged as a warning and ignored.

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

  drawPlugin.addFeature({
    id: 'monument1',
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-2.878, 54.709] },
    properties: { symbol: 'square', symbolBackgroundColor: '#28a197' }
  })
})
```

---

### `setStyle(featureId, styleChanges)`

Update an existing feature's style — stroke/fill/strokeWidth or, for a `Point`, its `symbol`-family properties (see `newPoint` above). Only the keys you pass are changed; anything else the feature already has is left alone. Returns `false` if the feature doesn't exist.

| Argument | Description |
|----------|-------------|
| `featureId` | **Type:** `string`<br />**Required**<br />ID of the feature to update |
| `styleChanges` | **Type:** `Object`<br />**Required**<br />Any mix of `stroke`, `fill`, `strokeWidth`, or `symbol`-family properties |

```js
drawPlugin.setStyle('monument1', { symbolBackgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' } })
```

---

### `deleteFeature(featureIds)`

Remove one or more features from the map.

| Argument | Description |
|----------|-------------|
| `featureIds` | **Type:** `string[]`<br />IDs of the features to remove |

```js
drawPlugin.deleteFeature(['test1234'])
```

---

### `split(featureId, options?)`

Start drawing a line across a polygon to split it in two. Splitting is a pure computation — it does not remove the original feature or add the results itself. Listen for [`draw:split`](#drawsplit) and call `deleteFeature`/`addFeature` yourself.

Always snaps to the polygon's own outline, in addition to any layers in `snapLayers`.

| Argument | Description |
|----------|-------------|
| `featureId` | **Type:** `string`<br />**Required**<br />ID of the polygon to split |
| `options.snapLayers` | **Type:** `string[]`<br />Additional layers to snap against, on top of the polygon's own outline |

```js
drawPlugin.split(selectedFeatureId)

interactiveMap.on('draw:split', (event) => {
  drawPlugin.deleteFeature([event.originalFeatureId])
  event.featureCollection.features.forEach((feature, index) => {
    drawPlugin.addFeature({
      id: `${event.originalFeatureId}-${index === 0 ? 'a' : 'b'}`,
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

| Argument | Description |
|----------|-------------|
| `featureIds` | **Type:** `string[]`<br />IDs of the polygons to merge |

**Returns:** the merged GeoJSON feature, or `null` if the merge failed (e.g. the polygons aren't actually contiguous).

```js
drawPlugin.merge(selectedFeatureIds)

interactiveMap.on('draw:merge', (event) => {
  drawPlugin.deleteFeature(event.originalFeatureIds)
  drawPlugin.addFeature({
    id: event.originalFeatureIds[0],
    type: event.feature.type,
    geometry: event.feature.geometry,
    properties: event.feature.properties
  })
})
```

---

### `setGeometry(geometry)`

Replace the shape in the current edit session, for example with a corrected boundary from a service. The change can be undone, and is checked like any other change, with phase `'change'`. Returns `false` (without doing anything) outside an edit session, or when the geometry type differs from the shape being edited.

| Argument | Description |
|----------|-------------|
| `geometry` | **Type:** `GeoJSON.Geometry`<br />**Required**<br />The new geometry, of the same type as the shape being edited |

```js
drawPlugin.setGeometry(correctedBoundary)
```

---

### `recheckGeometry(detail?)`

Call `onGeometryChange` again for the current shape, unchanged, with phase `'recheck'`. Use it when your answer may have changed without the shape changing — for example after the user chooses to ignore a warning — or to retry a check that failed. Returns `false` (without doing anything) outside a draw or edit session, or before the shape has been checked.

| Argument | Description |
|----------|-------------|
| `detail` | **Type:** `any`<br />Passed to `onGeometryChange` as `event.detail`, for example to tell an ignored warning from a retry |

```js
const ignoredWarnings = new Set()

let warnings = []

createDrawPlugin({
  onGeometryChange: async ({ feature, detail }, { signal }) => {
    // Ignoring a warning reuses the last answer; anything else, including a retry, asks again
    if (detail?.reason !== 'ignore') {
      warnings = await checkBoundary(feature, { signal })
    }
    return { valid: warnings.every((warning) => ignoredWarnings.has(warning.id)) }
  }
})

const onIgnoreWarning = (warning) => {
  ignoredWarnings.add(warning.id)
  drawPlugin.recheckGeometry({ reason: 'ignore' })
}

const onRetry = () => drawPlugin.recheckGeometry({ reason: 'retry' })
```

---

## Application mode

While drawing or editing, the plugin sets the `'draw'` [application mode](../api.md#setapplicationmodeid-options), which gives the interface over to drawing: every button, panel and control, in every slot, is hidden except draw's own and these defaults:

```js
['mapStyles', 'mapControls', 'scaleBar']
```

Everything reappears as it was when the draw or edit mode ends. Hidden items stay mounted, so open panels keep their state and scroll position, and modal panels are never hidden. The app root also gets the class `im-o-app--mode-draw`.

Adjust it with the [`applicationModes`](../api.md#applicationmodes) option, keyed by the mode id. For example, to also keep search and a control of your own, and hide the scale bar:

```js
new InteractiveMap('map', {
  applicationModes: {
    draw: { include: ['search', 'myControl'], exclude: ['scaleBar'] }
  }
})
```

Or set `draw: false` when every button on the map is deliberate — for example a single-task map that goes straight into editing a shape — so nothing is hidden.

> [!NOTE]
> The mode only changes the interface. Other plugins' own behaviour keeps running while their buttons are hidden, so disable any that shouldn't respond while drawing.

> [!IMPORTANT]
> If you use the [interact plugin](interact.md), disable it while drawing or editing. Otherwise map clicks select features as well as placing points, and both plugins show and hide the same crosshair. Call `interactPlugin.disable()` on [`draw:started`](#drawstarted) and [`draw:editstart`](#draweditstart), and `interactPlugin.enable()` on [`draw:created`](#drawcreated), [`draw:edited`](#drawedited) and [`draw:cancelled`](#drawcancelled).

## Buttons and keyboard shortcuts

The plugin registers its own toolbar buttons automatically — Cancel, Add point and Done in the actions bar, plus Undo, Snap and Delete point in the middle of the top row — which show and enable themselves based on the current draw/edit state. You don't need to render these yourself; augment them with your own trigger buttons (e.g. "Draw polygon", "Draw line") the way the [Draw tools example](../examples/draw-tools.mdx) does.

> [!NOTE]
> While drawing, a crosshair marks where the next point is placed. On touch, it's shown with the Add point button. Keyboard users get the crosshair and press <kbd>Enter</kbd> to add a point. Opening the map controls shows the crosshair and Add point button for every input type. Edit modes don't use the crosshair: vertices and midpoints are selected directly.

| Shortcut | Action |
|----------|--------|
| <kbd>Enter</kbd> | Add point (draw) |
| <kbd>Spacebar</kbd> | Select nearest point (edit) |
| <kbd>Option</kbd>/<kbd>Alt</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>←</kbd>/<kbd>→</kbd> | Select adjacent point (edit) |
| <kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>←</kbd>/<kbd>→</kbd> | Move point (edit) |
| <kbd>Shift</kbd> + <kbd>↑</kbd>/<kbd>↓</kbd>/<kbd>←</kbd>/<kbd>→</kbd> | Nudge point, fine step (edit) |
| <kbd>Delete</kbd> | Delete point (edit) |
| <kbd>Command</kbd>/<kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo |

A selected edit vertex also claims the map's [`enableMapControls`](../api.md#enablemapcontrols) D-pad, if enabled, so it can be nudged with the on-screen directional buttons as well as the keyboard.

## Events

Subscribe to events using `interactiveMap.on()`.

---

### `draw:ready`

Emitted once the draw plugin has initialised. Safe to call API methods from here.

**Payload:** None

---

### `draw:started`

Emitted when `newPolygon`, `newLine`, or `newPoint` starts a new draw session.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.mode` | **Type:** `'draw_polygon' \| 'draw_line' \| 'draw_point'`<br />The draw mode |
| `payload.featureId` | **Type:** `string`<br />ID of the new feature |

---

### `draw:editstart`

Emitted when `editFeature` opens an existing feature for editing.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.mode` | **Type:** `'edit_polygon' \| 'edit_line' \| 'edit_point'`<br />The kind of shape being edited |
| `payload.featureId` | **Type:** `string`<br />ID of the feature being edited |

---

### `draw:created`

Emitted when a new shape finishes drawing and passes its checks. Also fires for a shape that finished invalid, was automatically reopened in edit mode, and was then fixed and finished — from the caller's perspective it's still a creation, not an edit.

**Payload:** the finished `GeoJSON.Feature`

---

### `draw:edited`

Emitted when an existing feature finishes an edit session (via `editFeature`).

**Payload:** the edited `GeoJSON.Feature`

---

### `draw:reopened`

Emitted when a new shape is finished, its check fails, and it reopens in edit mode. See [Validation](#validation).

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.feature` | **Type:** `GeoJSON.Feature`<br />The reopened shape |
| `payload.status` | **Type:** `'invalid' \| 'error'`<br />`'invalid'` if the check failed, `'error'` if it threw or rejected |
| `payload.reason` | **Type:** `string \| null`<br />Why the check failed, or `null` if the result gave no reason |

---

### `draw:cancelled`

Emitted when the Cancel button is pressed during a draw or edit session. Cancelling a new shape that's waiting on its check, or has reopened in edit mode, removes it from the map. Also emitted when a new session starts while a finished shape is still waiting on its check, which discards it.

**Payload:** the feature being drawn/edited at the time of cancellation

---

### `draw:updated`

Emitted after a committed vertex operation (add/move/insert/delete) while editing. It isn't emitted while a new shape is being drawn. To keep a panel up to date while drawing and editing, use [`onGeometryChange`](#ongeometrychangeevent-context).

**Payload:** the updated `GeoJSON.Feature`

---

### `draw:vertexselection`

Emitted when the selected vertex changes in edit mode.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.index` | **Type:** `number`<br />The selected vertex, or `-1` when nothing is selected |
| `payload.numVertices` | **Type:** `number`<br />How many vertices the shape has |

---

### `draw:interfacetypechange`

Emitted when the input device changes mid-session (e.g. switching from mouse to touch and panning via the Move control) — sync your own `interfaceType` state from this if you're tracking it independently.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.interfaceType` | **Type:** `'mouse' \| 'touch' \| 'keyboard'`<br />The input device now in use |

---

### `draw:geometryinvalid`

Emitted whenever a check — a built-in rule, a placement rejected by `onGeometryPreview`, or an invalid result from `onGeometryChange` for the latest change — fails. Not emitted for the `'edit-start'` check of a feature that was already invalid. The `reason` is also shown as a hint toast, unless the result has its own `announcement`, or the shape simply hasn't reached its minimum vertex count yet. See [Validation](#validation).

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.feature` | **Type:** `GeoJSON.Feature`<br />The shape that failed the check |
| `payload.reason` | **Type:** `string`<br />Why the check failed |
| `payload.source` | **Type:** `'rules' \| 'callback'`<br />`'rules'` for a built-in rule, `'callback'` for `onGeometryPreview`, `onGeometryChange` or `onGeometryFinish` |
| `payload.phase` | **Type:** `string`<br />The phase of the check that failed. See [Validation](#validation) |
| `payload.mode` | **Type:** `string`<br />The draw mode |
| `payload.vertexIndex` | **Type:** `number`<br />The vertex involved, when there is one |

---

### `draw:add`

Emitted after `addFeature` adds a feature to the map.

**Payload:** the added `GeoJSON.Feature`

---

### `draw:delete`

Emitted after `deleteFeature` removes a feature.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.featureId` | **Type:** `string[]`<br />The IDs passed to `deleteFeature` |

---

### `draw:stylechange`

Emitted after `setStyle` updates a feature's style.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.featureId` | **Type:** `string`<br />ID of the updated feature |
| `payload.properties` | **Type:** `Object`<br />The style and symbol properties that were applied |

---

### `draw:split`

Emitted when `split` computes a successful split.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.originalFeatureId` | **Type:** `string`<br />ID of the polygon that was split |
| `payload.featureCollection` | **Type:** `GeoJSON.FeatureCollection`<br />The two resulting polygons |

---

### `draw:merge`

Emitted when `merge` computes a successful merge.

**Payload:**

| Property | Description |
|----------|-------------|
| `payload.originalFeatureIds` | **Type:** `string[]`<br />IDs of the polygons that were merged |
| `payload.feature` | **Type:** `GeoJSON.Feature`<br />The merged polygon |

```js
interactiveMap.on('draw:created', (feature) => {
  console.log('New feature drawn:', feature.id)
})

interactiveMap.on('draw:geometryinvalid', ({ reason }) => {
  console.log('Validation failed:', reason)
})
```
