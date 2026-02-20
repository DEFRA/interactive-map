# API reference

**InteractiveMap** is a customisable mapping interface, designed for specific use cases and with a focus on accessibiity. It is provided as a high-level API that works in conjunction with a mapping framework such as MapLibre. Alternative mapping frameworks are catererd for through the development of a custom provider.

The `InteractiveMap` object represents an instance of an InteractiveMap on your page. It emits events and provides methods that allow you to programmatically modify the map and trigger behaviour as users interact with it.

You create an instance of a InteractiveMap by specifying a `container` and `options` in the `constructor`. An InteractiveMap is then initialized on the page and returns an instance of an InteractiveMap object.

## Getting started

For installation and setup instructions, see the [Getting started](./getting-started.md) guide.

## Constructor

```js
const interactiveMap = new InteractiveMap(container, options)
```

> [!NOTE]
> UMD Usage: Replace InteractiveMap with defra.InteractiveMap if using pre-built scripts in the <head>. The rest of the code is identical.

Parameters:

### `container`
**Type:** `string`
**Required**

The `id` of a container element where the map will be rendered.

### `options`
**Type:** `Object`

Configuration object specifying map provider, map style, behaviour, and other settings. See Options below.

---

## Options

> [!NOTE]
> In addition to the options below, any option supported by your map engine can be passed and will be forwarded to the provider constructor. See your map provider's documentation for available options (e.g., [MapLibre MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)).

---

### `appColorScheme`
**Type:** `string`
**Default:** `'light'`

Colour scheme used by the application. Determines the colours of panels, buttons and controls.

**Possible values**

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

---

### `behaviour`
**Type:** `string`
**Default:** `'buttonFirst'`

Determines how and when the map is displayed.

**Possible values**

| Possible values |
|:--|
| **'buttonFirst'** *(default)*
Map is initially hidden and a button is displayed in its place. Selecting the button opens the map in fullscreen mode. The optional `pageTitle` property is appended to the page title. This behaviour minimises resources downloaded when not all users need a map. |
| **'inline'**
The map is rendered inline with the body content and initially visible. |
| **'hybrid'**
A combination of button and inline behaviour, controlled by the optional `hybridWidth`. At smaller sizes a button is displayed; at larger sizes the map is rendered inline. When fullscreen, the optional `pageTitle` property is appended to the page title. |
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

Initial center [lng, lat] or [easting, northing] depending on the crs of the map provider.

Passed directly to the underlying map engine.

---

### `containerHeight`
**Type:** `string`
**Default:** `'600px'`

CSS height applied to the map container when the map is `inline`.

---

### `deviceNotSupportedText`
**Type:** `string`

Message displayed when the user's device or browser is not supported.

---

### `enableFullscreen`
**Type:** `boolean`
**Default:** `false`

Whether a toggle button is displayed to allow the map to enter fullscreen mode.
The button is only displayed when the map is `inline`.

---

### `enableZoomControls`
**Type:** `boolean`
**Default:** `false`

Whether zoom control buttons are displayed.
Zoom controls are not diplayed when the interface type is `touch`.

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
The exit button is only displayed when the behavour is `buttonFirst` or `hybrid` and the map is `fullscreen`.

---

### `hybridWidth`
**Type:** `number | null`
**Default:** `null`

Optional viewport width breakpoint (in pixels) used by the `'hybrid'` behaviour.
When not set, defaults to `maxMobileWidth`.

---

### `keyboardHintText`
**Type:** `string`

HTML string providing keyboard shortcut instructions for assistive technology users.
The hint text is displayed as a popup label when the `viewport` has focus.

---

### `mapLabel`
**Type:** `string`
**Required**

Accessible label describing the purpose of the map.
This value is announced to screen readers.

---

### `mapProvider`
**Type:** `function`
**Required**

A factory function that returns a map provider instance, e.g., `maplibreProvider()`.

---

### `mapSize`
**Type:** `string`
**Default:** `'small'`

Visual size of text and features in the map itself.

**Possible values**

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

URL query parameter key used to persist map visibility state.

---

### `markerColor`
**Type:** `string | Object<string, string>`
**Default:** `'#ff0000'`

Default colour for map markers. Can be overridden per marker when calling `addMarker()`.

May be provided as:
- A single colour value applied to all map styles
- An object keyed by map style ID, allowing different colours per style

---

### `markers`
**Type:** `MarkerConfig[]`

Initial markers to display on the map.

See [MarkerConfig](./api/marker-config.md) for full details.

---

### `markerShape`
**Type:** `string`
**Default:** `'pin'`

Default shape for map markers. Can be overridden per marker when calling `addMarker()`.

> [!NOTE]
> Currently only `'pin'` is available. Additional shapes are planned for a future release.

---

### `maxExtent`
**Type:** `[number, number, number, number]`

Maximum viewable extent [west, south, east, north]. Passed directly to the map engine; implementation varies.

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
Only used when the beahviour is `buttonFirst` or `hybrid` and the map is displayed in `fullscreen` mode.

---

### `panDelta`
**Type:** `number`
**Default:** `100`

Distance (in pixels) the map pans during standard pan interactions.

---

### `plugins`
**Type:** `PluginDescriptor[]`

Plugins to load.

See [PluginDescriptor](./plugins/plugin-descriptor.md) for full details.

---

### `preserveStateOnClose`
**Type:** `boolean`  
**Default:** `false`  

Controls whether closing the map (via the browser back button or the exit map button when `hasExitButton` is `true` and the map is fullscreen) destroys the map instance or hides it while preserving its current state. Set to `true` to keep the map state intact, which is useful for implementations like a toggle map view list view pattern.

---

### `readMapText`
**Type:** `boolean`
**Default:** `false`

Whether map text labels can be selected and read aloud by assistive technologies.

> [!WARNING]
> **Experimental:** This is a development flag. It currently only works with MapLibre and specific styles. Do **not** enable in production unless fully tested.

---

### `reverseGeocodeProvider`
**Type:** `function | null`

A factory function that returns a reverse geocode provider instance, e.g., `openNamesProvider()`.

---

### `transformRequest`
**Type:** `function`

Function to transform outgoing requests (e.g., to add authentication headers). Passed directly to MapLibre; other map engines may have their own equivalent. For ESRI SDK, this is handled in the EsriMapProvider configuration.

```js
(url, resourceType) => { url, headers, credentials }
```

See the [MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/RequestParameters/) for full details.

> [!NOTE]
> This function is synchronous. For asynchronous authentication flows such as OAuth, consider alternative approaches like overriding the fetch prototype. Further guidance to follow.

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
| `options` | [`MarkerOptions`](./api/marker-config.md#markeroptions) | Optional marker appearance options |

```js
interactiveMap.addMarker('home', [-0.1276, 51.5074], { color: '#0000ff' })
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
interactiveMap.addButton('my-button', {
  label: 'Click me',
  iconId: 'info',
  onClick: (event, context) => console.log('Clicked'),
  mobile: { slot: 'top-right' },
  tablet: { slot: 'top-right' },
  desktop: { slot: 'top-right' }
})
```

---

### `addPanel(id, config)`

Add a panel to the UI at runtime.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Unique panel identifier |
| `config` | `PanelDefinition` | Panel configuration |

See [PanelDefinition](./api/panel-definition.md) for configuration options. When using this method, provide content via the `html` property.

```js
interactiveMap.addPanel('info-panel', {
  label: 'Information',
  html: '<p>Panel content here</p>',
  mobile: { slot: 'bottom' },
  tablet: { slot: 'left' },
  desktop: { slot: 'left' }
})
```

---

### `removePanel(id)`

Remove a panel from the UI.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Panel identifier to remove |

```js
interactiveMap.removePanel('info-panel')
```

---

### `showPanel(id)`

Show a panel.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Panel identifier to show |

```js
interactiveMap.showPanel('info-panel')
```

---

### `hidePanel(id)`

Hide a panel.

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

Set the application mode.

| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | `string` | Mode identifier |

```js
interactiveMap.setMode('fullscreen')
```

---

### `toggleButtonState(id, prop, value)`

Set or toggle a button state.

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Button identifier |
| `prop` | `string` | The button state to change: `'hidden'`, `'pressed'`, or `'disabled'` |
| `value` | `boolean` | Optional. If provided, sets state explicitly; otherwise toggles |

```js
// Toggle the pressed state
interactiveMap.toggleButtonState('my-button', 'pressed')

// Explicitly disable a button
interactiveMap.toggleButtonState('my-button', 'disabled', true)

// Hide a button
interactiveMap.toggleButtonState('my-button', 'hidden', true)
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

Emitted when the underlying map is in a state ready to interact with. For example, when using MapLibre this event is emitted after the map has been instantiated; for ESRI SDK it is emitted when `view.ready` is first true.

**Payload:** A controlled API object with the following properties:

| Property | Type | Description |
|---|---|---|
| `map` | Object | The underlying map instance (all providers) |
| `view` | Object | The map view (ESRI only) |
| `crs` | string | The coordinate reference system (e.g. `'EPSG:4326'`) |
| `fitToBounds` | Function | Fit the map to a bounding box |
| `setView` | Function | Set the map center and zoom |

```js
interactiveMap.on('map:ready', ({ map, crs, fitToBounds, setView }) => {
  interactiveMap.addMarker('home', [-0.1276, 51.5074])
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
