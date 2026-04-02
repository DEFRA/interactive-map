# Symbol Config

Symbol properties control the appearance of markers and point dataset features. The same properties apply whether you are configuring a marker, app-wide defaults via the constructor `symbolDefaults`, or a custom symbol registration.

> **Dataset style:** When used in a dataset `style` object, colour and visual properties use a `symbol` prefix to distinguish them from polygon/line properties at the same level — `symbolBackgroundColor` instead of `backgroundColor`, etc. The full list of prefixed properties is documented in [Datasets — style](../plugins/datasets.md#style).

## How values are resolved

Each property is optional. When a value is not set, the next level down supplies it:

1. **Hardcoded defaults** — the built-in fallback values in `symbolDefaults.js`
2. **Constructor defaults** — set via `symbolDefaults` when creating the map instance
3. **Symbol defaults** — properties set when registering a custom symbol via `symbolRegistry.register()` (plugin authors only)
4. **Per-item config** — values passed directly when adding a marker or configuring a dataset layer

So a colour set on a marker always wins. If it is not set there, the symbol's registered default is used. If that is not set either, the constructor default applies, and so on back to the hardcoded fallback.

**`haloColor` and `selectedColor` are different.** They are always taken from `MapStyleConfig`, falling back to the `mapColorScheme` scheme default (`haloColor`: `#ffffff` light / `#0b0c0c` dark; `selectedColor`: `#0b0c0c` light / `#ffffff` dark). Neither can be set at symbol registration or marker level. `haloWidth` and `selectedWidth` still follow the normal cascade from levels 1–4.

## Style-keyed colours

Any colour property can be a plain string or an object keyed by map style ID. This lets a single config work across all basemaps:

```js
backgroundColor: '#d4351c'
backgroundColor: { outdoor: '#d4351c', dark: '#ff6b6b' }
```

## Properties

---

### `symbol`
**Type:** `string`
**Default:** `'pin'`

Registered symbol ID to use. Built-in values: `'pin'`, `'circle'`. Ignored when `symbolSvgContent` is set.

---

### `symbolSvgContent`
**Type:** `string`

Inner SVG path content (no `<svg>` wrapper) to render as the symbol. Use `{{token}}` placeholders for colours. When set, `symbol` is ignored.

```js
{
  symbolSvgContent: `
    <path d="..." fill="none" stroke="{{selectedColor}}" stroke-width="{{selectedWidth}}"/>
    <path d="..." fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="{{haloWidth}}"/>
    <path d="..." fill="{{foregroundColor}}"/>
  `,
  viewBox: '0 0 38 38',
  anchor: [0.5, 1]
}
```

See [SVG structure](#svg-structure) for the standard three-layer pattern.

---

### `viewBox`
**Type:** `string`
**Default:** registered symbol's viewBox, or `'0 0 38 38'`

SVG `viewBox` attribute. Use alongside `symbolSvgContent` when your paths use a different coordinate space.

---

### `anchor`
**Type:** `[number, number]`
**Default:** registered symbol's anchor, or `[0.5, 0.5]`

Normalised `[x, y]` anchor point where `[0, 0]` is the top-left and `[1, 1]` is the bottom-right of the symbol. Determines which point on the symbol aligns with the geographic coordinate.

```js
anchor: [0.5, 1]   // bottom-centre — tip of a pin
anchor: [0.5, 0.5] // centre — circle or dot
```

---

### `backgroundColor`
**Type:** `string | Record<string, string>`
**Default:** `'#ca3535'`

Background fill colour of the symbol shape.

---

### `foregroundColor`
**Type:** `string | Record<string, string>`
**Default:** `'#ffffff'`

Foreground fill colour — the inner graphic element (e.g. the dot inside a pin).

---

### `haloColor`

See [`MapStyleConfig.haloColor`](./map-style-config.md#halocolor). This is a basemap-level property — it cannot be set per symbol or per marker.

---

### `haloWidth`
**Type:** `string`
**Default:** `'1'`

Stroke width of the halo in SVG units.

---

### `graphic`
**Type:** `string`

SVG `d` attribute value for the foreground graphic path. Replaces the inner shape (e.g. the dot inside a pin) while keeping the background, halo and selection ring intact.

Pass a built-in name or supply your own path data:

```js
// Named built-in — resolved automatically
{ symbol: 'pin', graphic: 'cross' }

// Inline path data
{ symbol: 'pin', graphic: 'M14 12 L24 20 L14 28 Z' }
```

Built-in named graphics (16×16 coordinate space, centred at 8,8):

| Name | Shape |
|------|-------|
| `'dot'` | Small filled circle — the default for `pin` and `circle` |
| `'cross'` | Filled plus / cross |
| `'diamond'` | Filled diamond / rotated square |
| `'triangle'` | Filled upward-pointing triangle |
| `'square'` | Filled square |

`graphic` follows the full resolution order above — it can be set as a symbol default, a constructor default, or per item.

---

### `selectedColor`

See [`MapStyleConfig.selectedColor`](./map-style-config.md#selectedcolor). This is a basemap-level property — it cannot be set per symbol or per marker.

---

### `selectedWidth`
**Type:** `string`
**Default:** `'6'`

Stroke width of the selection ring in SVG units. **App-wide only** — same rules as `selected`.

---

### Custom tokens

Any `{{token}}` placeholder in a symbol SVG beyond the built-in set is substituted automatically if a matching key is present anywhere in the resolution order:

```js
// Symbol SVG contains: fill="{{accentColor}}"
markers.add('id', coords, { accentColor: '#ffdd00' })
```

## SVG structure

Symbols are defined as inner SVG path content (no `<svg>` wrapper) using `{{token}}` placeholders. The standard three-layer structure is:

```js
svg: `
  <path d="..." fill="none" stroke="{{selectedColor}}" stroke-width="{{selectedWidth}}"/>
  <path d="..." fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="{{haloWidth}}"/>
  <path d="..." fill="{{foregroundColor}}"/>
`
```

- **Layer 1** — selection ring (stroke only, fill none) — hidden in normal rendering, visible when selected
- **Layer 2** — background shape with halo stroke
- **Layer 3** — foreground graphic (e.g. inner dot)
