# Symbol Config

Symbol properties control the appearance of markers and point dataset features. The same properties apply whether you are configuring a marker, app-wide defaults via the constructor `symbolDefaults`, or a custom symbol registration.

## How values are resolved

Each property is optional. A value set directly on a marker or dataset layer takes priority over everything else. If a property is not set there, the value registered with the symbol is used. If the symbol has no value for that property, the app-wide `symbolDefaults` from the constructor applies. If none of those are set, the built-in fallback listed under each property below is used.

`haloColor`, `selectedColor`, `haloWidth`, and `selectedWidth` are required tokens in the SVG structure (see [SVG structure](#svg-structure)). Include them in any custom `symbolSvgContent` — the app resolves their values automatically. Note that `haloColor` and `selectedColor` are always derived from the active map style and cannot be configured.

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

Registered symbol ID to use. Built-in values: `'pin'`, `'circle'`, `'square'`. Ignored when `symbolSvgContent` is set.

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

### `haloWidth`
**Type:** `number`
**Default:** `1`

Stroke width of the halo around the symbol background shape. Can be set in constructor `symbolDefaults`, at symbol registration, or per marker/dataset layer.

---

### `selectedWidth`
**Type:** `number`
**Default:** `6`

Stroke width of the selection ring shown when a marker is selected. Can be set in constructor `symbolDefaults` or per marker/dataset layer.

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

> `{{haloColor}}` and `{{selectedColor}}` are always injected from the active map style. They must be present in the SVG but cannot be configured.
