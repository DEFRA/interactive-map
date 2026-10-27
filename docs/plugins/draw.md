# Draw Plugin

The draw plugin lets users draw and edit point, polygon and line features on the map — placing vertices by click, tap, or keyboard, snapping to existing map layers, and validating geometry as it's built. Polygons can also be split and merged. It works identically with both the MapLibre and OpenLayers map providers, determining the correct adapter to use from the `mapProvider` passed to `InteractiveMap` — there's nothing to configure in the plugin itself.

> [!IMPORTANT]
> **Using a bundler (ESM)?** This plugin includes adapters for more than one map provider, so your bundler needs to ignore the map engines you haven't installed. See [Bundler configuration](../getting-started.md#bundler-configuration-esm).

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

Every geometry change is checked against a set of built-in rules, plus your own callbacks if you provide them:

- [`onGeometryPreview`](#ongeometrypreviewevent) — synchronous. Gives live feedback while a shape is drawn or dragged, and can reject a vertex before it's placed.
- [`onGeometryChange`](#ongeometrychangeevent-context) — called after each committed change. Can be asynchronous. Its result for the latest change gates the Done button.

### Built-in rules

| Rule | Applies to | Behaviour |
|------|-----------|-----------|
| Minimum vertices | Polygon (3), Line (2) | Gates the Done button — a shape below the minimum can't be finished |
| Self-intersection | Polygon | Gates the Done button — a self-crossing shape can't be finished |
| Self-intersection (placement) | Polygon | Rejects a vertex placement outright if it would make the drawn path cross itself — the vertex never appears |
| Non-zero area | Polygon | Gates the Done button — a collinear/degenerate ring can't be finished |

Rule failures gate the Done button (the shape can pass through interim invalid states while being built or reshaped, shown with a dashed outline) except the placement-time self-intersection check, which is a hard veto — that specific vertex is rejected and never placed.

### Setting the callbacks

Both callbacks are set at the plugin level (`createDrawPlugin({ onGeometryPreview, onGeometryChange })`) or per call, in the options of `newPolygon`, `newLine`, `newPoint` and `editFeature`. A per-call callback replaces the plugin-level one for that session. To run both, call the plugin-level callback from the per-call one.

Each session has one of each callback. When more than one part of your app needs `onGeometryChange`, such as a measurements panel and a rules service, pass a single callback that calls each of them and returns the result that should gate Done:

```js
createDrawPlugin({
  onGeometryChange: (event, context) => {
    measurements.update(event.feature)
    return rules.check(event, context)
  }
})
```

Neither is used by `split` (which checks that the line divides the shape in two) or by `merge`, `addFeature` and `setStyle`.

Both return the same result:

| Return value | Meaning |
|---|---|
| `true` / `undefined` | Valid |
| `false` | Invalid, no reason shown |
| `{ valid, reason, announcement, recheckOnFinish }` | Valid or invalid, with these optional fields |

| Result field | Type | Description |
|---|---|---|
| `reason` | `string` | Why the shape is invalid. Shown as a hint toast and sent with [`draw:geometryinvalid`](#drawgeometryinvalid) |
| `announcement` | `string` | Announced to screen readers instead of draw's own message, whether the result is valid or not. When set, `reason` isn't shown as a hint toast, so you can present the issue yourself. From `onGeometryPreview`, only a rejected placement is announced |
| `recheckOnFinish` | `boolean` | `onGeometryChange` only. When the shape is finished, check it again with phase `'create'` rather than reusing this result. See [Checking once a shape is finished](#checking-once-a-shape-is-finished) |

Both receive the same event:

| Property | Type | Description |
|----------|------|-------------|
| `feature` | `GeoJSON.Feature` | The shape being checked — the in-progress feature during `'preview'`, the committed or candidate feature in every other phase |
| `phase` | `string` | Why the callback was called — see each callback's phases below |
| `mode` | `'draw_polygon' \| 'draw_line' \| 'draw_point' \| 'edit_vertex' \| 'edit_point'` | The active draw mode |
| `vertexIndex` | `number` | Index of the vertex being placed, added, moved, inserted or deleted. Present on `'place'`, and on a `'change'` to a single vertex |
| `numVertices` | `number` | Count of already-committed vertices, excluding any in-progress cursor point. Present on every `'preview'` call |

### `onGeometryPreview(event)`

**Signature:** `onGeometryPreview(event) => boolean | { valid: boolean, reason?: string, announcement?: string } | undefined`

Must return synchronously. A returned Promise is treated as valid.

| Phase | When | Effect |
|-------|------|--------|
| `'preview'` | Every rubber-band move or drag, throttled to once per frame | Drives the dashed outline and the Add point button. While editing, also gates the Done button |
| `'place'` | A click, tap, <kbd>Enter</kbd> or Add point press, before the vertex is placed | Invalid rejects the vertex — it never appears |

It runs on every frame of a drag, so keep it quick, using only the shape and data already in the page. Rules about a single vertex, such as where the first point may go, belong here: `onGeometryChange` isn't called until the shape has its minimum number of vertices.

### `onGeometryChange(event, context)`

**Signature:** `onGeometryChange(event, { signal, revision }) => boolean | { valid: boolean, reason?: string, announcement?: string, recheckOnFinish?: boolean } | undefined | Promise<…>`

| Phase | When |
|-------|------|
| `'change'` | The shape changed: a vertex was added, moved, inserted or removed, the shape was replaced with [`setGeometry`](#setgeometrygeometry), or a change was undone |
| `'edit-start'` | `editFeature` opened the feature, before anything has changed |
| `'recheck'` | [`recheckGeometry`](#recheckgeometrydetail) was called. Its `detail`, if given, is passed as `event.detail` |
| `'create'` | A shape was finished without a passing or pending result for its final geometry, such as a new point, or its last result set [`recheckOnFinish`](#checking-once-a-shape-is-finished) |

| Context property | Type | Description |
|----------|------|-------------|
| `signal` | `AbortSignal` | Aborted when a newer change is made or the session ends. Pass it to `fetch` to cancel a request that's no longer needed |
| `revision` | `number` | Increases with every check |

It's only called once the built-in rules pass. When a built-in rule fails, [`draw:geometryinvalid`](#drawgeometryinvalid) is emitted instead.

Only the result for the latest change counts. A result for an earlier change is ignored, whenever it arrives. A failed result disables Done and blocks the finishing gestures (double-click, <kbd>Enter</kbd> or clicking the first vertex), and so does a thrown error or rejected Promise — call `recheckGeometry()` to retry.

A pending result doesn't stop a shape being finished. If a new polygon or line is finished, or a point is placed, while its check is pending, Done is disabled until the result arrives, then the shape is created, or reopened in edit mode with [`draw:reopened`](#drawreopened) if the check failed. If Done is pressed while editing with a check pending, the edit finishes once the check passes. If it fails, or the shape is changed again first, editing carries on.

If a check takes longer than 300ms while Done is waiting on it, Done reads "Checking…" and has `aria-busy`. Screen readers hear "Checking shape" for any check that takes that long, then the result: "Shape check passed", the `reason` it failed, or "Shape could not be checked". A quicker answer settles without any of these. A result's own `announcement` is always announced.

### Checking once a shape is finished

By default, finishing a shape reuses the result for its final change. To make one check, such as a single service call, once the whole shape exists, return `recheckOnFinish: true` while drawing. `onGeometryChange` is then called again with phase `'create'` when the shape is finished, and that result decides whether it's created or reopened in edit mode.

The same callback can keep a panel of measurements up to date while drawing:

```js
createDrawPlugin({
  onGeometryChange: ({ feature, phase, mode }, { signal }) => {
    panel.update(measureArea(feature))
    if (mode.startsWith('draw_') && phase === 'change') {
      return { valid: true, recheckOnFinish: true }
    }
    return checkWithService(feature, { signal })
  }
})
```

An `async` function works here too. Its Promise for a change you don't check settles straight away, well inside the 300ms before anything is shown or announced.

Changes made after the shape reopens in edit mode are checked as usual, including [`setGeometry`](#setgeometrygeometry). Undo starts empty in a reopened session. Cancel, while the shape is reopened or waiting on its check, discards it.

### Debouncing

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

## Methods

Methods are called on the plugin instance. `newPolygon`, `newLine`, `newPoint`, `editFeature`, `addFeature`, `setStyle`, `deleteFeature`, `split`, `merge`, `setGeometry` and `recheckGeometry` all need `mapProvider.draw` to be ready — call them after [`draw:ready`](#drawready).

---

### `newPolygon(featureId, options?)`

Start drawing a new polygon.

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID to assign the finished feature |
| `options.snapLayers` | `string[]` | Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryPreview` | `Function` | Replaces the plugin-level `onGeometryPreview` for this session — see [Validation](#validation) |
| `options.onGeometryChange` | `Function` | Replaces the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |
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

### `newPoint(featureId, options?)`

Start drawing a new point. Unlike `newPolygon`/`newLine`, it commits as soon as a point is placed — there's no Done step.

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID to assign the finished feature |
| `options.snapLayers` | `string[]` | Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryPreview` | `Function` | Replaces the plugin-level `onGeometryPreview` for this session — see [Validation](#validation) |
| `options.onGeometryChange` | `Function` | Replaces the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |
| `options.properties` | `Object` | Custom GeoJSON properties to set on the finished feature |
| `options.symbol` | `string` | Built-in symbol id — `'pin'`, `'circle'`, `'square'`, `'hexagon'`, `'triangle'`, or `'diamond'` |
| `options.symbolSvgContent` | `string` | Custom SVG markup, used instead of `symbol` |
| `options.symbolBackgroundColor` | `string \| Record<string, string>` | Symbol background colour |
| `options.symbolForegroundColor` | `string \| Record<string, string>` | Symbol foreground colour |
| `options.symbolGraphic` | `string` | Overrides the symbol's inner graphic (built-in name or SVG path data) |
| `options.symbolHaloWidth` | `number` | Symbol halo width |
| `options.symbolViewBox` | `string` | SVG `viewBox`, for use with `symbolSvgContent` |
| `options.symbolAnchor` | `[number, number]` | Normalised `[x, y]` anchor point |
| `options.symbolSize` | `'small' \| 'medium' \| 'large'` | Symbol size — see [Symbol Config](../api/symbol-config.md#size) |

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

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID of the feature to edit |
| `options.snapLayers` | `string[]` | Overrides the plugin-level `snapLayers` for this session |
| `options.onGeometryPreview` | `Function` | Replaces the plugin-level `onGeometryPreview` for this session — see [Validation](#validation) |
| `options.onGeometryChange` | `Function` | Replaces the plugin-level `onGeometryChange` for this session — see [Validation](#validation) |

```js
const editSuccess = drawPlugin.editFeature(selectedFeatureId)
if (!editSuccess) {
  return
}
```

---

### `addFeature(feature)`

Add a `Point`, `LineString`, or `Polygon` feature directly to the map without a draw session — e.g. loading in existing shapes on `draw:ready`.

| Argument | Type | Description |
|----------|------|-------------|
| `feature.id` | `string` | **Required.** Feature ID |
| `feature.type` | `string` | Defaults to `'Feature'` if omitted |
| `feature.geometry` | `GeoJSON.Geometry` | **Required.** `Point`, `LineString`, or `Polygon` geometry |
| `feature.stroke` | `string \| Record<string, string>` | Stroke colour (`LineString`/`Polygon`) |
| `feature.fill` | `string \| Record<string, string>` | Fill colour (`Polygon`) |
| `feature.strokeWidth` | `number` | Stroke width in pixels (`LineString`/`Polygon`) |
| `feature.properties` | `Object` | Custom GeoJSON properties — a `Point`'s `symbol`-family properties go here (see `newPoint` above) |

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

| Argument | Type | Description |
|----------|------|-------------|
| `featureId` | `string` | **Required.** ID of the feature to update |
| `styleChanges` | `Object` | **Required.** Any mix of `stroke`, `fill`, `strokeWidth`, or `symbol`-family properties |

```js
drawPlugin.setStyle('monument1', { symbolBackgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' } })
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

| Argument | Type | Description |
|----------|------|-------------|
| `featureIds` | `string[]` | IDs of the polygons to merge |

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

| Argument | Type | Description |
|----------|------|-------------|
| `geometry` | `GeoJSON.Geometry` | **Required.** The new geometry, of the same type as the shape being edited |

```js
drawPlugin.setGeometry(correctedBoundary)
```

---

### `recheckGeometry(detail?)`

Call `onGeometryChange` again for the current shape, unchanged, with phase `'recheck'`. Use it when your answer may have changed without the shape changing — for example after the user chooses to ignore a warning — or to retry a check that failed. Returns `false` (without doing anything) outside a draw or edit session, or before the shape has been checked.

| Argument | Type | Description |
|----------|------|-------------|
| `detail` | `any` | Passed to `onGeometryChange` as `event.detail`, for example to tell an ignored warning from a retry |

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

**Payload:** `{ mode: 'draw_polygon' | 'draw_line' | 'draw_point', featureId: string }`

---

### `draw:editstart`

Emitted when `editFeature` opens an existing feature for editing.

**Payload:** `{ mode: 'edit_polygon' | 'edit_line' | 'edit_point', featureId: string }`

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

Emitted when a new shape is finished, its `onGeometryChange` check fails, and it reopens in edit mode. See [Validation](#validation).

**Payload:** `{ feature, status: 'invalid' | 'error', reason }` — `reason` is `null` unless an invalid result gave one

---

### `draw:cancelled`

Emitted when the Cancel button is pressed during a draw or edit session. Cancelling a new shape that's waiting on its check, or has reopened in edit mode, removes it from the map. Also emitted when a new session starts while a finished shape is still waiting on its check, which discards it.

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

Emitted whenever a check — a built-in rule, a placement rejected by `onGeometryPreview`, or an invalid result from `onGeometryChange` for the latest change — fails. Not emitted for the `'edit-start'` check of a feature that was already invalid. The `reason` is also shown as a hint toast, unless the result has its own `announcement`, or the shape simply hasn't reached its minimum vertex count yet. See [Validation](#validation).

**Payload:** `{ feature, reason, source, phase, mode, vertexIndex? }` — `source` is `'rules'` for a built-in rule and `'callback'` for `onGeometryPreview` or `onGeometryChange`

---

### `draw:add`

Emitted after `addFeature` adds a feature to the map.

**Payload:** the added `GeoJSON.Feature`

---

### `draw:delete`

Emitted after `deleteFeature` removes a feature.

**Payload:** `{ featureId: string }`

---

### `draw:stylechange`

Emitted after `setStyle` updates a feature's style.

**Payload:** `{ featureId: string, properties: Object }` — the flattened style/symbol properties that were applied

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
