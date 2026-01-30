# MarkerConfig

Configuration for a map marker. Used in the `markers` option to define initial markers.

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique marker identifier. Use this ID to reference the marker when calling `removeMarker()`.

---

### `coords`
**Type:** `[number, number]`
**Required**

Coordinates [lng, lat] or [easting, northing] depending on the CRS of the map provider.

---

### `options`
**Type:** `MarkerOptions`

Optional marker appearance options. See [MarkerOptions](#markeroptions) below.

---

## MarkerOptions

Options for customising marker appearance.

### `color`
**Type:** `string | Object<string, string>`

Marker colour. Can be:
- A single colour value applied to all map styles
- An object keyed by map style ID, allowing different colours per style

Overrides the default `markerColor` option.

### `shape`
**Type:** `string`

Marker shape (e.g., `'pin'`). Overrides the default `markerShape` option.

> [!NOTE]
> Currently only `'pin'` is available. Additional shapes are planned for a future release.
