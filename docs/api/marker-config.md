# MarkerConfig

A marker is a pin or symbol placed at a specific coordinate on the map, used to highlight a location. The properties below are used in the `markers` option to define initial markers. The `MarkerOptions` properties also apply to markers added at runtime via `addMarker()`.

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

Controls the visual appearance of a marker. All properties are optional — unset values fall back through the [resolution order](./symbol-config.md#how-values-are-resolved).

---

### `symbol`
**Type:** `string`
**Default:** `'pin'`

Symbol to use for this marker. Built-in symbols: `'pin'`, `'circle'`, `'square'`. For a custom one-off symbol, use `symbolSvgContent` instead.

---

### `symbolSvgContent`
**Type:** `string`

Inner SVG path content (no `<svg>` wrapper) to render instead of a registered symbol. Use `{{token}}` placeholders for colours. When set, `symbol` is ignored.

```js
// Using built-in tokens with per-style colours
markers.add('id', coords, {
  symbolSvgContent: `
    <path d="..." fill="none" stroke="{{selectedColor}}" stroke-width="{{selectedWidth}}"/>
    <path d="..." fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="{{haloWidth}}"/>
    <path d="..." fill="{{foregroundColor}}"/>
  `,
  viewBox: '0 0 38 38',
  anchor: [0.5, 1],
  backgroundColor: { outdoor: '#d4351c', dark: '#ff6b6b' }
})

// Using a custom token
markers.add('id', coords, {
  symbolSvgContent: `
    <path d="..." fill="{{customColor}}"/>
  `,
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  customColor: { outdoor: '#1d70b8', dark: '#4c9ed9' }
})
```

`{{selectedColor}}` and `{{selectedWidth}}` are required to render the selected ring around the marker when it is in its selected state.

> [!NOTE]
> `selectedColor` cannot be set per marker — it is controlled by `MapStyleConfig.selectedColor`.

---

### `viewBox`
**Type:** `string`
**Default:** registered symbol's viewBox, or `'0 0 38 38'`

SVG `viewBox` attribute for the symbol. Use alongside `symbolSvgContent` when your paths use a different coordinate space.

---

### `anchor`
**Type:** `[number, number]`
**Default:** registered symbol's anchor, or `[0.5, 0.5]`

Normalised [x, y] anchor point where `[0, 0]` is top-left and `[1, 1]` is bottom-right. Determines which point on the symbol aligns with the geographic coordinate.

```js
anchor: [0.5, 1]   // bottom-centre — tip of a pin
anchor: [0.5, 0.5] // centre — circle or dot
```

---

### Colour and graphic properties

`backgroundColor`, `foregroundColor`, `haloWidth`, `graphic`, `selectedWidth`, and any custom tokens are all supported.

See [Symbol Config](./symbol-config.md) for the full property reference.
