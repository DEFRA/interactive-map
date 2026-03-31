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

Controls the visual appearance of a marker. All properties are optional — unset values fall back through the cascade: constructor `symbolDefaults` → `symbolDefaults.js`.

Color values may be a plain string or an object keyed by map style ID, allowing different colors per basemap:

```js
background: { outdoor: '#d4351c', dark: '#ff6b6b' }
```

---

### `symbol`
**Type:** `string`
**Default:** `symbolDefaults.symbol` (constructor) → `'pin'` (hardcoded)

Symbol to use for this marker. Built-in values: `'pin'`, `'circle'`. Ignored when `symbolSvgContent` is set.

---

### `symbolSvgContent`
**Type:** `string`

Inner SVG path content (no `<svg>` wrapper) to render instead of a registered symbol. Use `{{token}}` placeholders for colours. When set, `symbol` is ignored.

```js
markers.add('id', coords, {
  symbolSvgContent: `
    <path d="..." fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
    <path d="..." fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
    <path d="..." fill="{{foreground}}"/>
  `,
  viewBox: '0 0 38 38',
  anchor: [0.5, 1],
  background: { outdoor: '#d4351c', dark: '#ff6b6b' }
})
```

`{{selected}}` and `{{selectedWidth}}` are valid tokens in a custom SVG — they will be resolved when the marker is rendered in its selected state. Their values are app-wide and configured via constructor `symbolDefaults`, not per marker.

---

### `viewBox`
**Type:** `string`
**Default:** registered symbol's viewBox, or `'0 0 38 38'`

SVG `viewBox` attribute for the symbol, e.g. `'0 0 38 38'`. Use alongside `symbolSvgContent` when your paths use a different coordinate space.

---

### `anchor`
**Type:** `[number, number]`
**Default:** registered symbol's anchor, or `[0.5, 0.5]`

Normalised [x, y] anchor point where `[0, 0]` is the top-left and `[1, 1]` is the bottom-right of the symbol. Determines which point on the symbol aligns with the geographic coordinate.

```js
anchor: [0.5, 1]   // bottom-centre — tip of a pin
anchor: [0.5, 0.5] // centre — centred circle or dot
```

---

### `background`
**Type:** `string | Record<string, string>`

Background fill colour of the symbol shape.

---

### `foreground`
**Type:** `string | Record<string, string>`

Foreground fill colour — the inner graphic element of the symbol (e.g. the dot inside a pin).

---

### `halo`
**Type:** `string | Record<string, string>`

Stroke colour of the halo ring drawn around the symbol edge. Defaults to white on light basemaps and dark on dark basemaps.

---

### `haloWidth`
**Type:** `string`
**Default:** `'1'`

Stroke width of the halo in SVG units.

---

### `graphic`
**Type:** `string`

SVG `d` attribute value for the foreground graphic path of the symbol. Replaces the inner shape (e.g. the dot inside a pin) while keeping the background, halo and selection ring intact.

Each built-in symbol (`pin`, `circle`) provides a default dot — pass a named graphic, a raw `d` string, or omit to keep the default:

```js
// Named built-in graphic (resolved automatically)
markers.add('id', coords, { symbol: 'pin', graphic: 'cross' })

// Inline path data
markers.add('id', coords, { symbol: 'pin', graphic: 'M14 12 L24 20 L14 28 Z' })
```

---

### Custom tokens

If a custom symbol SVG uses additional `{{token}}` placeholders beyond the built-in set, any matching key passed in `MarkerOptions` is substituted automatically:

```js
// Symbol SVG contains: fill="{{accentColor}}"
markers.add('id', coords, { accentColor: '#ffdd00' })
```
