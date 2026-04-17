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

Colour scheme for the app UI chrome — panels, buttons, and controls. Set to `'dark'` when the surrounding UI should use the dark theme to complement the basemap. Independent of `mapColorScheme`; for example an aerial basemap might use `mapColorScheme: 'dark'` while keeping `appColorScheme` unset (light panels).

---

### `mapColorScheme`
**Type:** `'light' | 'dark'`

Colour scheme for elements rendered on top of the map. Sets the default values of `haloColor`, `selectedColor`, and `foregroundColor` when those are not explicitly provided. Set to `'dark'` when the basemap is dark (e.g. night or aerial) so that overlays remain legible against it.

- `'light'` (default) — dark overlays (`#0b0c0c`) on a light basemap, white halo
- `'dark'` — light overlays (`#ffffff`) on a dark or aerial basemap, dark halo

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

Halo colour for elements rendered on top of the map (e.g. symbol outlines). Provides contrast between overlay elements and the map background.

Falls back to the `mapColorScheme` default when not set (`#ffffff` for light, `#0b0c0c` for dark). Injected as the `--map-overlay-halo-color` CSS custom property.

---

### `selectedColor`
**Type:** `string`

Theme colour for selected state — used by map overlay components to indicate a selected feature.

Falls back to the `mapColorScheme` default when not set (`#0b0c0c` for light, `#ffffff` for dark). Injected as the `--map-overlay-selected-color` CSS custom property.

---

### `foregroundColor`
**Type:** `string`

Foreground colour for elements rendered on top of the map (e.g. text or iconography in overlay controls).

Falls back to the `mapColorScheme` default when not set (`#0b0c0c` for light, `#ffffff` for dark). Injected as the `--map-overlay-foreground-color` CSS custom property.
