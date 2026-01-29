# MapOptions

Configuration object specifying map provider, map style, behaviour, and other settings for an `InteractiveMap` instance.

> Used as the `options` parameter in `new InteractiveMap(container, options)`.

## Properties

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

Whether to automatically determine the colour scheme based on the user’s system preferences.

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

### `containerHeight`
**Type:** `string`  
**Default:** `'600px'`

CSS height applied to the map container when the map is `inline`.

---

### `deviceNotSupportedText`
**Type:** `string`

Message displayed when the user’s device or browser is not supported.

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

Whether zoom control buttons are displayed on the map UI.
Zoom controls are not diplayed when the interface type is `touch`.

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

Visual size variant of the map UI.

**Possible values**

| Possible values |
|:--|
| **'small'** *(default)*  
The default map size. |
| **'medium'**  
All text and features are scaled **`150%`** |
| **'large'**  
All text and features are scaled **`200%`**. |

---

### `mapStyle`
**Type:** `MapStyle`  
**Required`

Map style configuration.

See [MapStyle](./api/map-style.md) for full details.

---

### `mapViewParamKey`
**Type:** `string`  
**Default:** `'mv'`

URL query parameter key used to persist map visibility state.

---

### `markerColor`
**Type:** `string | Object<string, string>`  
**Default:** `'#ff0000'`

Colour used for map markers.

May be provided as:  
- A single colour value applied to all map styles  
- An object keyed by map style ID, allowing different colours per style

---

### `markerShape`
**Type:** `string`  
**Default:** `'pin'`

Shape used for map markers.

---

### `maxMobileWidth`
**Type:** `number`  
**Default:** `640`

Maximum viewport width (in pixels) considered to be a mobile device.

---

### `minDesktopWidth`
**Type:** `number`  
**Default:** `835`

Minimum viewport width (in pixels) considered to be a desktop device.

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

### `panDelta`
**Type:** `number`  
**Default:** `100`

Distance (in pixels) the map pans during standard pan interactions.

---

### `pageTitle`
**Type:** `string`

Page title text appended to the existing page title.
Only used when the beahviour is `buttonFirst` or `hybrid` and the map is displayed in `fullscreen` mode.

---

### `readMapText`
**Type:** `boolean`  
**Default:** `false`

Whether map text labels can be selected and read aloud by assistive technologies.

> ⚠️ **Experimental:** This is a development flag. It currently only works with MapLibre and specific styles. Do **not** enable in production unless fully tested.

---

### `reverseGeocodeProvider`
**Type:** `function | null`

A factory function that returns a reverse geocode provider instance, e.g., `openNamesProvider()`.

---

### `zoomDelta`
**Type:** `number`  
**Default:** `1`

Amount to change the zoom level for standard zoom interactions.

---

## Map framework options

Options supported by the underlying map framework should be provided here, e.g., **`zoom`**, **`center`**.

These options are passed directly to the map provider.

For a full list of supported options, see  
[MapLibre MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/).
