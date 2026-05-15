# MapStyleConfig

Configuration for a map style (basemap appearance).

## Properties

---

### `id`
**Type:** `string`

Unique identifier for the style. Used to reference the style programmatically.

---

### `type`
**Type:** `'raster' | 'ogc-vt'`

> [!NOTE]
> This property is only relevant when using the **OpenLayers provider**. The ESRI and MapLibre providers always use the standard Mapbox GL vector tile format and ignore this property.

Allows the OpenLayers provider to support raster, standard vector tile, and OGC API - Tiles basemaps. When omitted, OpenLayers uses the standard Mapbox GL vector tile path — the same format ESRI and MapLibre always use.

- `'raster'` — XYZ raster tile source. `url` should be a tile URL template with `{x}`, `{y}`, `{z}` placeholders.
- `'ogc-vt'` — OGC API - Tiles vector tile source. `url` should point to an OGC style endpoint that returns a Mapbox GL style document.

---

### `renderMode`
**Type:** `'hybrid' | 'vector'`

> [!NOTE]
> This property is only relevant when using the **OpenLayers provider** with vector tile styles (standard or `'ogc-vt'`). It is ignored for raster styles and by other providers.

Sets the render mode on the OpenLayers `VectorTileLayer`. When omitted, OpenLayers defaults to `'hybrid'`.

- `'hybrid'` (default) — polygon and line elements are rendered as images, so pixels are scaled during zoom animations. Point symbols and texts are accurately rendered as vectors and can stay upright on rotated views, but get lifted above all polygon and line elements.
- `'vector'` — everything is rendered as vectors and the original render order is maintained. Use this mode for improved performance and visual experience on vector tile layers with not too many rendered features (e.g. for highlighting a subset of features of another layer with the same source).

```js
// Standard vector tile
{
  id: 'outdoor',
  url: 'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_27700_Outdoor.json',
  renderMode: 'vector'
}

// OGC vector tile
{
  id: 'outdoor-ngd',
  type: 'ogc-vt',
  url: 'https://api.os.uk/maps/vector/ngd/ota/v1/collections/ngd-base/styles/27700?key=YOUR_API_KEY',
  renderMode: 'vector'
}
```

---

### `url`
**Type:** `string`
**Required**

URL that returns a Mapbox GL style document (Mapbox Style Specification).

```js
// OS Vector Tile API — Outdoor (EPSG:27700)
{
  url: 'https://raw.githubusercontent.com/OrdnanceSurvey/OS-Vector-Tile-API-Stylesheets/main/OS_VTS_27700_Outdoor.json'
}
```

> [!NOTE]
> The **OpenLayers provider** supports two additional URL forms via the `type` property.
>
> ```js
> // type 'ogc-vt' — OS NGD OGC API - Tiles, Outdoor (EPSG:27700)
> {
>   type: 'ogc-vt',
>   url: 'https://api.os.uk/maps/vector/ngd/ota/v1/collections/ngd-base/styles/27700?key=YOUR_API_KEY'
> }
>
> // type 'raster' — OS Maps API, Raster Outdoor (EPSG:27700)
> {
>   type: 'raster',
>   url: 'https://api.os.uk/maps/raster/v1/zxy/Outdoor_27700/{z}/{x}/{y}.png?key=YOUR_API_KEY'
> }
> ```

---

### `label`
**Type:** `string`

Display label for the style.

---

### `appColorScheme`
**Type:** `'light' | 'dark'`

Colour scheme for the app UI chrome — panels, buttons, and controls. Set to `'dark'` when the surrounding UI should use the dark theme to complement the basemap. Independent of `mapColorScheme`; for example an aerial basemap might use `mapColorScheme: 'dark'` while keeping `appColorScheme` unset (light panels).

---

### `mapColorScheme`
**Type:** `'light' | 'dark'`

Colour scheme for elements rendered on top of the map. Sets the default values of `haloColor`, `selectedColor`, `activeColor`, and `foregroundColor` when those are not explicitly provided. Set to `'dark'` when the basemap is dark (e.g. night or aerial) so that overlays remain legible against it.

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

Theme colour for committed selection — used by map overlay components to indicate a selected feature.

Falls back to the `mapColorScheme` default when not set (`#0b0c0c` for light, `#ffffff` for dark). Injected as the `--map-overlay-selected-color` CSS custom property.

---

### `activeColor`
**Type:** `string`

Theme colour for the active (keyboard cursor) focus ring — shown on the item currently under the keyboard cursor, whether or not it is committed to the selection.

Falls back to `#ffdd00` (GOV.UK yellow) for both light and dark schemes when not set.

---

### `foregroundColor`
**Type:** `string`

Foreground colour for elements rendered on top of the map (e.g. text or iconography in overlay controls).

Falls back to the `mapColorScheme` default when not set (`#0b0c0c` for light, `#ffffff` for dark). Injected as the `--map-overlay-foreground-color` CSS custom property.
