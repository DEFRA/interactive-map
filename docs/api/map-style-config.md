# MapStyleConfig

Configuration for a map style (basemap appearance).

## Properties

---

### `id`
**Type:** `string`

Unique identifier for the style. Used to reference the style programmatically.

---

### `url`
**Type:** `string`
**Required**

URL to the style.json (Mapbox Style Specification).

---

### `label`
**Type:** `string`

Display label for the style. Shown in style switcher UI.

---

### `appColorScheme`
**Type:** `'light' | 'dark'`

App UI colour scheme. Ensures that panels, buttons, and controls use the appropriate colour scheme to match the map style.

---

### `mapColorScheme`
**Type:** `'light' | 'dark'`

Map colour scheme. Used to determine the style of controls rendered on the map, such as halo colours.

---

### `backgroundColor`
**Type:** `string`

CSS background colour. Allows the viewport background to match the background layer of the style, preventing flash of incorrect colour during load.

---

### `attribution`
**Type:** `string`

Attribution text for the map style.

---

### `logo`
**Type:** `string`

URL to logo image.

---

### `logoAltText`
**Type:** `string`

Alt text for the logo image.

---

### `thumbnail`
**Type:** `string`

URL to thumbnail image. Used in style switcher UI.

---

### `haloColor`
**Type:** `string`

Halo colour for symbols rendered on this basemap. Falls back to `#ffffff` when not set. Not overridable at symbol registration or marker level — set per-basemap here.

Typically set to white on light basemaps and dark on dark basemaps to provide contrast against the map background.

---

### `selectedColor`
**Type:** `string`

Colour used to indicate selected features — applied to the symbol selection ring (by the symbol renderer) and to selected lines and polygons (by the interact plugin).

Not overridable at symbol registration or marker level. Set once per basemap here to keep selection appearance consistent across the whole app.
