# API reference

**InteractiveMap** is a customisable mapping interface, designed for specific use cases and with a focus on accessibiity. It is provided as a high-level API that works in conjunction with a mapping framework such as MapLibre. Alternative mapping frameworks are catered for through the development of a custom provider.

The `InteractiveMap` object represents an instance of an InteractiveMap on your page. It emits events and provides methods that allow you to programmatically modify the map and trigger behaviour as users interact with it.

You create an instance of a InteractiveMap by specifying a `container` and `options` in the `constructor`. An InteractiveMap is then initialized on the page and returns an instance of an InteractiveMap object.

## Getting started <!-- no-sidebar -->

For installation and setup instructions, see the [Getting started](./getting-started.md) guide.

## Constructor

```js
const interactiveMap = new InteractiveMap(container, options)
```

> [!NOTE]
> UMD Usage: Replace InteractiveMap with defra.InteractiveMap if using pre-built scripts in the `<head>` tag. The rest of the code is identical.

Parameters:

### `container`
**Type:** `string`
**Required**

The `id` of a container element where the map will be rendered.

---

### `options`
**Type:** `Object`

Configuration object specifying map provider, map style, behaviour, and other settings. See Options below.

> [!NOTE]
> In addition to the options below, any option supported by your map engine can be passed and will be forwarded to the provider constructor. See your map provider's documentation for available options (e.g., [MapLibre MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)).

---

## Options

---

### `appColorScheme`
**Type:** `string`
**Default:** `'light'`

Colour scheme used by the application. Determines the colours of panels, buttons and controls.

| Possible values |
|:--|
| **'light'** *(default)*
Uses a light colour scheme. |
| **'dark'**
Uses a dark colour scheme. |

---

### `autoColorScheme`
**Type:** `boolean`
**Default:** `false`

Whether to automatically determine the colour scheme based on the user's system preferences.

---

### `backgroundColor`
**Type:** `string | Object<string, string>`
**Default:** `var(--background-color)`

Background colour applied to the map container. Allows application background colour to compliment the map style.

May be provided as:
- A single CSS colour value applied to all map styles
- An object keyed by map style ID, where each value is a valid CSS colour

```js
// Single value applied to all map styles
new InteractiveMap('map', {
  backgroundColor: '#f5f5f0'
})

// Keyed by map style ID
new InteractiveMap('map', {
  backgroundColor: { outdoor: '#f5f5f0', dark: '#383F43' }
})
```

---

### `behaviour`
**Type:** `string`
**Default:** `'buttonFirst'`

Determines how and when the map is displayed.

| Possible values |
|:--|
| **'buttonFirst'** *(default)*
Map is initially hidden and a button is displayed in its place. Selecting the button opens the map in fullscreen mode. The optional `pageTitle` property is appended to the page title. This provides a less intrusive experience for users who do not need or cannot use the map. It also minimises resources downloaded for services where the map is not central. |
| **'inline'**
The map is rendered inline with the body content and initially visible. |
| **'hybrid'**
A combination of buttonFirst and inline behaviour, controlled by the optional `hybridWidth`. At smaller sizes a button is displayed; at larger sizes the map is rendered inline. When fullscreen, the optional `pageTitle` property is appended to the page title. |
| **'mapOnly'**
Renders the map fullscreen on all devices, using the existing page title. |

---

### `bounds`
**Type:** `[number, number, number, number]`

Initial bounds [west, south, east, north]. Equivalent to `extent`; use whichever matches your map provider's terminology.

Passed directly to the underlying map engine.

---

### `buttonClass`
**Type:** `string`
**Default:** `'im-c-open-map-button'`

CSS class applied to the button used to open the map.
The button is only displayed when the `'behaviour'` is `hybrid` or `buttonFirst`.

---

### `buttonText`
**Type:** `string`
**Default:** `'Map view'`

Text content displayed inside the button used to open the map.
The button is only displayed when the `behaviour` is `hybrid` or `buttonFirst`.

---

### `center`
**Type:** `[number, number]`

Initial centre [lng, lat] or [easting, northing] depending on the crs of the map provider.

Passed directly to the underlying map engine.

---

### `containerHeight`
**Type:** `string`
**Default:** `'600px'`

CSS height applied to the map container. Only used when the map is rendered inline; ignored when displayed fullscreen.

---

### `deviceNotSupportedText`
**Type:** `string`

Message displayed when the user's device or browser is not supported.

---

### `enableFullscreen`
**Type:** `boolean`
**Default:** `false`

Whether a toggle button is displayed to allow the map to enter fullscreen mode.
The button is only displayed when the map is rendered inline.

---

### `enableZoomControls`
**Type:** `boolean`
**Default:** `true`

Whether zoom control buttons are displayed.
Zoom controls are not displayed when the interface type is 'touch'.

---

### `extent`
**Type:** `[number, number, number, number]`

Initial extent [minX, minY, maxX, maxY]. Equivalent to `bounds`; use whichever matches your map provider's terminology.

Passed directly to the underlying map engine.

---

### `genericErrorText`
**Type:** `string`

Fallback error message shown when the map fails to load.

---

### `hasExitButton`
**Type:** `boolean`
**Default:** `false`

Whether an exit button is displayed.
The exit button is only displayed when the behaviour is `buttonFirst` or `hybrid` and the map is displayed fullscreen.

---

### `hybridWidth`
**Type:** `number | null`
**Default:** `null`

Optional viewport width breakpoint (in pixels) used by the `hybrid` behaviour.
When not set, defaults to `maxMobileWidth`.

---

### `keyboardHintText`
**Type:** `string`

HTML string shown as a tooltip on the viewport when it receives keyboard focus, prompting the user to open the keyboard shortcuts modal.

> [!NOTE]
> It is unlikely you will need to override this. If you do, keep the text short to avoid breaking the layout of the tooltip.

---

### `mapLabel`
**Type:** `string`
**Required**

Accessible name for the map viewport, which has a role of `application`. This label is announced by screen readers when the viewport receives focus and should describe the purpose of the map.

```js
new InteractiveMap('map', {
  mapLabel: 'Flood risk areas in England'
})
```

---

### `mapProvider`
**Type:** `function`
**Required**

A function that returns a map provider — the abstraction layer that interfaces with the underlying map engine. It is called only when the map is opened so the provider code is not sent to the user unless needed.

```js
new InteractiveMap('map', {
  mapProvider: maplibreProvider()
})
```

#### MapLibre provider options

`maplibreProvider()` accepts an optional config object.

##### `workerUrl`
**Type:** `string`
**Default:** `undefined`

URL to a separately hosted MapLibre worker file (`maplibre-gl-csp-worker.js`). Required when running under a Content Security Policy that blocks `blob:` worker URLs — a common restriction on government and enterprise platforms.

When set, MapLibre loads its rendering worker from this URL instead of generating an inline blob, so your CSP only needs `worker-src 'self'` rather than `worker-src blob:`.

The worker file ships with maplibre-gl and must be served from your own origin (copy from `node_modules/maplibre-gl/dist/maplibre-gl-csp-worker.js`).

**ESM:**

```js
maplibreProvider({ workerUrl: '/your-assets-path/maplibre-gl-csp-worker.js' })
```

**UMD:**

```js
defra.maplibreProvider({ workerUrl: '/your-assets-path/maplibre-gl-csp-worker.js' })
```

---

### `mapSize`
**Type:** `string`
**Default:** `'small'`

Visual size of text and features in the map itself.

| Possible values |
|:--|
| **'small'** *(default)*
The default map size. |
| **'medium'**
Scaled **`150%`** |
| **'large'**
Scaled **`200%`**. |

---

### `mapStyle`
**Type:** `MapStyleConfig`
**Required**

Map style configuration.

See [MapStyleConfig](./api/map-style-config.md) for full details.

---

### `mapViewParamKey`
**Type:** `string`
**Default:** `'mv'`

URL query parameter key used to persist map visibility state. Override if the default value clashes with an existing parameter on your page.

---

### `markers`
**Type:** `MarkerConfig[]`

Initial markers to display on the map.

See [MarkerConfig](./api/marker-config.md) for full details.

---

### `symbolDefaults`
**Type:** `Partial<SymbolDefaults>`

App-wide defaults for symbol and marker appearance.

| Property | Default |
|---|---|
| `symbol` | `'pin'` |
| `backgroundColor` | `'#ca3535'` |
| `foregroundColor` | `'#ffffff'` |
| `haloWidth` | `'1'` |
| `selectedWidth` | `'6'` |

```js
new InteractiveMap('map', {
  symbolDefaults: {
    symbol: 'circle',
    backgroundColor: { outdoor: '#1d70b8', dark: '#4c9ed9' }
  }
})
```

See [Symbol Config](./api/symbol-config.md) for the full property list.

---

### `maxExtent`
**Type:** `[number, number, number, number]`

Maximum viewable extent [west, south, east, north]. Passed directly to the underlying map engine; how it is enforced depends on the provider.

---

### `maxMobileWidth`
**Type:** `number`
**Default:** `640`

Maximum viewport width (in pixels) considered to be a mobile device.

---

### `maxZoom`
**Type:** `number`

Maximum zoom level.

Passed directly to the underlying map engine.

---

### `minDesktopWidth`
**Type:** `number`
**Default:** `835`

Minimum viewport width (in pixels) considered to be a desktop device.

---

### `minZoom`
**Type:** `number`

Minimum zoom level.

Passed directly to the underlying map engine.

---

### `mode`
**Type:** `string | null`
**Default:** `null`

Initial application mode. Modes facilitate attaching behaviour to certain states, enabling short user journey steps within the map interface. Plugins can be configured to respect modes, only rendering content when the app is in a specific mode.

See also: [`setMode()`](#setmodemode) method.

---

### `nudgePanDelta`
**Type:** `number`
**Default:** `5`

Smaller pan distance (in pixels) used for fine-grained panning interactions.

---

### `nudgeZoomDelta`
**Type:** `number`
**Default:** `0.1`

Smaller zoom increment used for fine-grained zoom adjustments.

---

### `pageTitle`
**Type:** `string`

Supplementary text appended to the existing page title.
Only used when the behaviour is `buttonFirst` or `hybrid` and the map is displayed fullscreen.

---

### `panDelta`
**Type:** `number`
**Default:** `100`

Distance (in pixels) the map pans during standard pan interactions.

---

### `plugins`
**Type:** `PluginDescriptor[]`

Optional extensions that add features such as datasets, search, or custom panels to the map.

See [PluginDescriptor](./plugins/plugin-descriptor.md) for full details.

---

### `preserveStateOnClose`
**Type:** `boolean`  
**Default:** `false`  

Controls whether closing the map destroys the map instance or hides it while preserving its current state. When `true`, state is retained between open and close — for example in a map/list toggle, a user can interact with the map, switch to the list view, then reopen the map and pick up exactly where they left off.

---

### `readMapText`
**Type:** `boolean`
**Default:** `false`

Whether map text labels can be selected and read aloud by assistive technologies.

> [!CAUTION]
> This is experimental. It currently only works with MapLibre and specific styles. Do **not** enable in production unless fully tested.

---

### `reverseGeocodeProvider`
**Type:** `function | null`

A function that returns a reverse geocode provider used to convert map coordinates to a place name, for example when announcing the current map position to screen reader users. Like the map provider, it is only called when the map is opened so the provider code is not sent to the user unless needed.

```js
new InteractiveMap('map', {
  reverseGeocodeProvider: openNamesProvider()
})
```

---

### `transformRequest`
**Type:** `function`

Function to transform outgoing requests, for example to add authentication headers. This option is specific to MapLibre and is passed directly to the underlying MapLibre instance.

```js
(url, resourceType) => { url, headers, credentials }
```

See the [MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/RequestParameters/) for full details.

> [!NOTE]
> For ESRI SDK, request transformation is handled in the EsriMapProvider configuration rather than through this option.

---

### `zoom`
**Type:** `number`

Initial zoom level.

Passed directly to the underlying map engine.

---

### `zoomDelta`
**Type:** `number`
**Default:** `1`

Amount to change the zoom level for standard zoom interactions.

---

## Methods

---

### `on(eventName, handler)`

Subscribe to an event.

```js
interactiveMap.on('app:ready', () => {
  console.log('Map is ready')
})
```

See [Events](#events) for available event names.

---

### `off(eventName, handler)`

Unsubscribe from an event.

```js
const handler = () => console.log('Ready')
interactiveMap.on('app:ready', handler)
interactiveMap.off('app:ready', handler)
```

---

### `addMarker(id, coords, options)`

Add a marker to the map.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique marker identifier |
| `coords` | `[number, number]` | Coordinates [lng, lat] or [easting, northing] depending on CRS |
| `options` | `MarkerOptions` | Optional marker appearance options |

See [MarkerOptions](./api/marker-config.md#markeroptions) for configuration options.

```js
interactiveMap.addMarker('home', [-0.1276, 51.5074], { backgroundColor: '#1d70b8' })
```

---

### `removeMarker(id)`

Remove a marker from the map.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Marker identifier to remove |

```js
interactiveMap.removeMarker('home')
```

---

### `addButton(id, config)`

Add a button to the UI at runtime.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique button identifier |
| `config` | `ButtonDefinition` | Button configuration |

See [ButtonDefinition](./api/button-definition.md) for configuration options.

```js
// Simple button
interactiveMap.addButton('my-button', {
  label: 'Click me',
  iconId: 'info',
  onClick: (event, context) => console.log('Clicked'),
  mobile: { slot: 'top-right' },
  tablet: { slot: 'top-right' },
  desktop: { slot: 'top-right' }
})

// Button with a popup menu (experimental: only reliable when centred in the action bar)
interactiveMap.addButton('my-menu', {
  label: 'Options',
  iconId: 'menu',
  mobile: { slot: 'top-right' },
  tablet: { slot: 'top-right' },
  desktop: { slot: 'top-right' },
  menuItems: [
    { id: 'opt-a', label: 'Option A', onClick: () => console.log('A') },
    { id: 'opt-b', label: 'Option B', onClick: () => console.log('B') }
  ]
})
```

---

### `addPanel(id, config)`

Adds a new panel with content to the UI at runtime. Focus is moved to the panel by default — set `focus: false` in the config to suppress this when adding panels on page load.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique panel identifier |
| `config` | `PanelDefinition` | Panel configuration |

See [PanelDefinition](./api/panel-definition.md) for all configuration options.

```js
interactiveMap.addPanel('info-panel', {
  label: 'Information',
  html: '<p>Panel content here</p>',
  mobile: { slot: 'drawer' },
  tablet: { slot: 'left-top' },
  desktop: { slot: 'left-top' }
})
```

---

### `removePanel(id)`

Removes a panel from the UI entirely. Use `hidePanel` instead if you want to show it again later.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Panel identifier to remove |

```js
interactiveMap.removePanel('info-panel')
```

---

### `showPanel(id, options?)`

Shows a panel that already exists but is hidden. Focus is moved to the panel by default — set `focus: false` to suppress this, useful when you want focus to remain on the triggering button.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Panel identifier to show |
| `options.focus` | `boolean` | Whether to move focus to the panel. Default: `true` |

```js
interactiveMap.showPanel('info-panel')

// Keep focus on the triggering button
interactiveMap.showPanel('info-panel', { focus: false })
```

---

### `hidePanel(id)`

Hides a panel without removing it, preserving its content for when it is shown again.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Panel identifier to hide |

```js
interactiveMap.hidePanel('info-panel')
```

---

### `addControl(id, config)`

Add a custom control to the UI at runtime.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique control identifier |
| `config` | `ControlDefinition` | Control configuration |

See [ControlDefinition](./api/control-definition.md) for configuration options.

---

### `setMode(mode)`

Programmatically set the application mode. See the [`mode`](#mode) option for more detail.

| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | `string` | Mode identifier |

```js
interactiveMap.setMode('fullscreen')
```

---

### `toggleButtonState(id, prop, value)`

Set or toggle a button state. Where applicable the corresponding ARIA attribute is updated — `aria-pressed`, `aria-disabled`, or `aria-expanded`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Button identifier |
| `prop` | `string` | The button state to change: `'hidden'`, `'pressed'`, `'disabled'`, or `'expanded'` |
| `value` | `boolean` | Optional. If provided, sets state explicitly; otherwise toggles |

```js
// Toggle the pressed state
interactiveMap.toggleButtonState('my-button', 'pressed')

// Explicitly disable a button
interactiveMap.toggleButtonState('my-button', 'disabled', true)

// Hide a button
interactiveMap.toggleButtonState('my-button', 'hidden', true)

// Set expanded state (e.g. for a button controlling collapsible content)
interactiveMap.toggleButtonState('my-button', 'expanded', true)

// Control a menu item's state using its id
interactiveMap.toggleButtonState('opt-a', 'pressed', true)
```

---

### `fitToBounds(bounds)`

Fit the map view to a bounding box or GeoJSON geometry. Safe zone padding is automatically applied so the content remains fully visible.

| Parameter | Type | Description |
|-----------|------|-------------|
| `bounds` | `[number, number, number, number]` | Bounds as [west, south, east, north] or [minX, minY, maxX, maxY] depending on CRS |
| `bounds` | `object` | A GeoJSON Feature, FeatureCollection, or geometry — bbox is computed automatically |

```js
// Flat bbox
interactiveMap.fitToBounds([-0.489, 51.28, 0.236, 51.686])

// GeoJSON Feature
interactiveMap.fitToBounds({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
  properties: {}
})

// GeoJSON FeatureCollection
interactiveMap.fitToBounds({
  type: 'FeatureCollection',
  features: [featureA, featureB]
})
```

---

### `setView(options)`

Set the map center and zoom. Safe zone padding is automatically applied.

| Parameter | Type | Description |
|-----------|------|-------------|
| `options` | `Object` | View options |
| `options.center` | `[number, number]` | Optional center [lng, lat] or [easting, northing] depending on CRS |
| `options.zoom` | `number` | Optional zoom level |

```js
interactiveMap.setView({ center: [-0.1276, 51.5074], zoom: 12 })
```

---

### `open()`

Programmatically open the map. Equivalent to the user clicking the open button. If the map has been hidden (e.g. in hybrid mode), it will be shown; otherwise the app will be loaded for the first time.

```js
interactiveMap.open()
```

---

### `close()`

Programmatically close the map. Triggers the same logic as the exit button. If `preserveStateOnClose` is `true`, the map is hidden but not destroyed; otherwise the app is removed entirely.

```js
interactiveMap.close()
```

---

## Events

Subscribe to events using `interactiveMap.on()` and unsubscribe with `interactiveMap.off()`.

```js
// Subscribe to an event
interactiveMap.on('app:ready', () => {
  console.log('Map is ready!')
})

// Unsubscribe from an event
const handler = ({ panelId }) => console.log('Panel opened:', panelId)
interactiveMap.on('app:panelopened', handler)
interactiveMap.off('app:panelopened', handler)
```

---

### `app:ready`

Emitted when the app is ready—layout and padding have been calculated and the map is about to be rendered. Emitted before `map:ready`.

**Payload:** None

```js
interactiveMap.on('app:ready', () => {
  console.log('App is ready')
})
```

---

### `map:ready`

Emitted when the underlying map is ready and initial app state (style and size) has settled.

**Payload:**

| Property | Type | Description |
|---|---|---|
| `map` | Object | The underlying map instance (all providers) |
| `view` | Object | The map view (ESRI only) |
| `crs` | string | The coordinate reference system (e.g. `'EPSG:4326'`) |
| `mapStyleId` | string | The ID of the active map style |
| `mapSize` | string | The active map size (`'small'`, `'medium'`, or `'large'`) |

```js
interactiveMap.on('map:ready', ({ map, mapStyleId, mapSize }) => {
  console.log('Active style:', mapStyleId, 'Size:', mapSize)
})
```

---

### `map:stylechange`

Emitted when the map style finishes loading after a style change.

**Payload:** `{ mapStyleId: string }`

```js
interactiveMap.on('map:stylechange', ({ mapStyleId }) => {
  console.log('Style changed to', mapStyleId)
})
```

---

### `map:sizechange`

Emitted when the map size changes.

**Payload:** `{ mapSize: string }`

```js
interactiveMap.on('map:sizechange', ({ mapSize }) => {
  console.log('Map size changed to', mapSize)
})
```

---

### `app:panelopened`

Emitted when a panel is opened.

**Payload:** `{ panelId: string }`

```js
interactiveMap.on('app:panelopened', ({ panelId }) => {
  console.log('Panel opened:', panelId)
})
```

---

### `app:panelclosed`

Emitted when a panel is closed.

**Payload:** `{ panelId: string }`

```js
interactiveMap.on('app:panelclosed', ({ panelId }) => {
  console.log('Panel closed:', panelId)
})
