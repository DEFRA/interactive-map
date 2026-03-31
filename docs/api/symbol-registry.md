# Symbol Registry

The symbol registry is a service that manages reusable named symbols for map markers. It is available to plugin authors via `services.symbolRegistry`.

> **Application code** that needs a one-off custom marker should pass [`symbolSvgContent`](./marker-config.md#symbolsvgcontent) directly to `addMarker()` via `MarkerOptions` instead — no registration required.

## Built-in symbols

Two symbols are registered by default:

| ID | Anchor | Description |
|----|--------|-------------|
| `'pin'` | `[0.5, 1]` | Teardrop pin — tip aligns with the coordinate |
| `'circle'` | `[0.5, 0.5]` | Filled circle — centre aligns with the coordinate |

Both use the standard `{{token}}` placeholders and respect the token cascade.

## Token cascade

Token values are resolved in this order — each level overrides the one above:

| Level | How to set |
|-------|-----------|
| `symbolDefaults.js` | Hardcoded fallback — last resort |
| Constructor `symbolDefaults` | `new InteractiveMap('id', { symbolDefaults: { ... } })` |
| Symbol registration | Properties on the symbol definition object passed to `register()` |
| Marker creation | `MarkerOptions` passed to `addMarker()` or `markers.add()` |

`selected` and `selectedWidth` are **not** overridable at the marker creation level — they are resolved from the first three levels only, via `resolveSelected()`.

## SymbolDefaults

All properties that can be set in the constructor `symbolDefaults` config or on a symbol definition:

| Token | Type | Default | Description |
|-------|------|---------|-------------|
| `symbol` | `string` | `'pin'` | Default symbol ID (structural — not an SVG token) |
| `symbolSvgContent` | `string` | — | Default inline SVG paths (structural) |
| `viewBox` | `string` | `'0 0 38 38'` | SVG viewBox (structural) |
| `anchor` | `[number, number]` | `[0.5, 0.5]` | Anchor point (structural) |
| `background` | `string \| Record<string, string>` | `'#1d70b8'` | Background fill colour |
| `foreground` | `string \| Record<string, string>` | `'#ffffff'` | Foreground fill colour |
| `halo` | `string \| Record<string, string>` | style-keyed | Halo stroke colour |
| `selected` | `string \| Record<string, string>` | `'#ffdd00'` | Selection ring colour (used by `resolveSelected` only) |
| `haloWidth` | `string` | `'1'` | Halo stroke width in SVG units |
| `selectedWidth` | `string` | `'6'` | Selection ring stroke width in SVG units |

## SVG structure

Symbols are defined as inner SVG path content (no `<svg>` wrapper) using `{{token}}` placeholders. The standard three-layer structure is:

```js
svg: `
  <path d="..." fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="..." fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <path d="..." fill="{{foreground}}"/>
`
```

- **Layer 1** — selection ring (stroke only, fill none) — hidden in normal rendering
- **Layer 2** — background shape with halo stroke
- **Layer 3** — foreground graphic (e.g. inner dot)

## Methods

Available on `services.symbolRegistry` inside a plugin.

---

### `setDefaults(defaults)`

Set constructor-level defaults. Called automatically during app initialisation with the `symbolDefaults` constructor config. Plugin authors do not normally need to call this.

---

### `getDefaults()`

Returns the merged app-wide defaults (hardcoded `symbolDefaults.js` + constructor overrides). Includes both structural properties and token values.

```js
const defaults = services.symbolRegistry.getDefaults()
// { symbol: 'pin', background: '#1d70b8', selected: '#ffdd00', ... }
```

---

### `register(symbolDef)`

Register a custom symbol. Once registered it can be referenced by ID via `MarkerOptions.symbol`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique symbol identifier |
| `svg` | `string` | Yes | Inner SVG path content with `{{token}}` placeholders |
| `viewBox` | `string` | Yes | SVG viewBox, e.g. `'0 0 38 38'` |
| `anchor` | `[number, number]` | Yes | Normalised [x, y] anchor point |
| *(token)* | `string \| Record<string, string>` | No | Any token override e.g. `selected: '#ff0000'` |

```js
services.symbolRegistry.register({
  id: 'star',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  selected: '#ff0000',
  svg: `
    <path d="..." fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
    <path d="..." fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
    <path d="..." fill="{{foreground}}"/>
  `
})
```

---

### `get(id)`

Returns the symbol definition for the given ID, or `undefined` if not registered.

```js
const symbolDef = services.symbolRegistry.get('pin')
```

---

### `list()`

Returns an array of all registered symbol definitions.

```js
const symbols = services.symbolRegistry.list()
```

---

### `resolve(symbolDef, styleColors, mapStyleId)`

Resolves a symbol's SVG for **normal (unselected) rendering**. The `{{selected}}` token is always replaced with an empty string regardless of cascade values — the selection ring is structurally present but invisible.

```js
const svg = services.symbolRegistry.resolve(
  services.symbolRegistry.get('pin'),
  { background: '#d4351c' },
  'outdoor'
)
```

---

### `resolveSelected(symbolDef, styleColors, mapStyleId)`

Resolves a symbol's SVG for **selected rendering**. The `{{selected}}` token uses the cascade value (symbol definition → constructor `symbolDefaults` → `symbolDefaults.js`). Use this when rendering the highlight layer for an interact or datasets selection.

```js
const svg = services.symbolRegistry.resolveSelected(
  services.symbolRegistry.get('pin'),
  { background: '#d4351c' },
  'outdoor'
)
```

## Custom tokens

Any `{{token}}` placeholder in the SVG beyond the built-in set is substituted automatically if a matching key is present anywhere in the cascade:

```js
services.symbolRegistry.register({
  id: 'flag',
  viewBox: '0 0 38 38',
  anchor: [0, 1],
  flagColor: '#d4351c',
  svg: `<path d="..." fill="{{flagColor}}"/><path d="..." fill="{{poleColor}}"/>`
})

// When adding a marker:
markers.add('id', coords, { symbol: 'flag', poleColor: '#0b0c0c' })
```
