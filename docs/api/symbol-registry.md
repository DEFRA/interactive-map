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

`selected` and `selectedWidth` are **app-wide only** — they follow only the first two levels (hardcoded defaults → constructor). They cannot be set at symbol registration or marker creation level, ensuring selection appearance is consistent across all symbols.

## SymbolDefaults

Properties available in the constructor `symbolDefaults` config. Structural properties (marked below) are not SVG tokens — they control how the symbol is rendered rather than substituting a placeholder.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `symbol` | `string` | `'pin'` | Default symbol ID *(structural)* |
| `symbolSvgContent` | `string` | — | Default inline SVG paths *(structural)* |
| `viewBox` | `string` | `'0 0 38 38'` | SVG viewBox *(structural)* |
| `anchor` | `[number, number]` | `[0.5, 0.5]` | Anchor point *(structural)* |
| `background` | `string \| Record<string, string>` | `'#ca3535'` | Background fill colour |
| `foreground` | `string \| Record<string, string>` | `'#ffffff'` | Foreground fill colour |
| `halo` | `string \| Record<string, string>` | style-keyed | Halo stroke colour |
| `haloWidth` | `string` | `'1'` | Halo stroke width in SVG units |
| `graphic` | `string` | symbol's own default | SVG `d` attribute for the foreground graphic path — see [Graphic token](#graphic-token) |
| `selected` | `string \| Record<string, string>` | style-keyed | Selection ring colour — app-wide only |
| `selectedWidth` | `string` | `'6'` | Selection ring stroke width — app-wide only |

`selected` and `selectedWidth` can only be configured here or in `symbolDefaults.js`. They are ignored at symbol registration and marker creation level.

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
// { symbol: 'pin', background: '#ca3535', selected: { outdoor: '#0b0c0c', dark: '#ffffff' }, ... }
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
| *(token)* | `string \| Record<string, string>` | No | Default token value for this symbol, e.g. `background: '#1d70b8'`. `selected` and `selectedWidth` are ignored here — set them via constructor `symbolDefaults`. |

```js
services.symbolRegistry.register({
  id: 'star',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  background: '#1d70b8',
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

## Graphic token

The built-in `pin` and `circle` symbols support a `{{graphic}}` token — the `d` attribute of their foreground path. This lets you swap the inner graphic shape without writing a custom SVG.

```js
import { graphics } from './symbols/graphics.js'

// Use a built-in named graphic
markers.add('id', coords, { symbol: 'pin', graphic: graphics.cross })

// Use inline path data
markers.add('id', coords, { symbol: 'pin', graphic: 'M14 12 L24 20 L14 28 Z' })
```

Built-in named graphics (all sized for the standard 38×38 viewBox):

| ID | Shape |
|----|-------|
| `graphics.dot` | Small filled circle — the default for `pin` |
| `graphics.cross` | Filled plus / cross |
| `graphics.diamond` | Filled diamond / rotated square |
| `graphics.triangle` | Filled upward-pointing triangle |
| `graphics.square` | Filled square |

`graphic` follows the full token cascade — it can be set as a symbol-level default, a constructor default, or per-marker. Each built-in symbol sets its own `graphic` default, so omitting `graphic` always produces the standard appearance.

Custom symbols that use a `{{graphic}}` token work the same way — pass `graphic` at registration or marker-creation level.

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
