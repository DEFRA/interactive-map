# Symbol Registry

The symbol registry is a service that manages reusable named symbols for map markers. It is available to plugin authors via `services.symbolRegistry`. Each map has its own registry, so symbols registered and `symbolDefaults` set on one map don't affect another on the same page.

> **Application code** that needs a one-off custom marker should pass [`symbolSvgContent`](./symbol-config.md#symbolsvgcontent) directly to `addMarker()` via `MarkerOptions` instead — no registration required.

## Built-in symbols

Six symbols are registered by default:

| ID | Anchored at | Description |
|----|-------------|-------------|
| `'pin'` | Tip | Teardrop pin |
| `'circle'` | Centre | Filled circle |
| `'square'` | Centre | Rounded square |
| `'hexagon'` | Centre | Pointy-top hexagon |
| `'triangle'` | Centroid | Point-up triangle |
| `'diamond'` | Centre | Square rotated 45° |

Each can be shown at any [`symbolSize`](./symbol-config.md#symbolsize) and takes a custom [`graphic`](./symbol-config.md#graphic). They use the same [token resolution order](./symbol-config.md#how-values-are-resolved) as any other symbol.

## Methods

Available on `services.symbolRegistry` inside a plugin.

---

### `setDefaults(defaults)`

Set constructor-level defaults. Called automatically during app initialisation with the `symbolDefaults` constructor config. Plugin authors do not normally need to call this.

---

### `getDefaults()`

Returns the map's merged defaults (hardcoded `symbolDefaults.js` + constructor overrides).

```js
const defaults = services.symbolRegistry.getDefaults()
// { symbol: 'pin', backgroundColor: '#ca3535', foregroundColor: '#ffffff', ... }
```

---

### `register(symbolDef)`

Register a custom SVG-template symbol, such as one with several colours. Once registered it can be referenced by ID via `MarkerOptions.symbol` or a dataset `style.symbol`. Throws if `id`, `svg` or `viewBox` is missing, or `anchor` is invalid.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique symbol identifier |
| `svg` | `string` | Yes | Inner SVG path content with `{{token}}` placeholders — see [SVG structure](./symbol-config.md#svg-structure) |
| `viewBox` | `string` | Yes | SVG viewBox, e.g. `'0 0 44 44'`. Anything drawn outside it is cut off |
| `anchor` | `[number, number]` | No | Normalised [x, y] anchor point within the viewBox. **Default:** `[0.5, 0.5]` |
| *(token)* | `string \| Record<string, string>` | No | Default token value for this symbol, e.g. `backgroundColor: '#1d70b8'`. `selectedColor` and `activeColor` are ignored here — they are always derived from the active map style. |

```js
services.symbolRegistry.register({
  id: 'star',
  viewBox: '0 0 44 44',
  anchor: [0.5, 0.5],
  backgroundColor: '#1d70b8',
  svg: `
    <path d="..." fill="{{selectedColor}}" stroke="{{activeColor}}" stroke-width="6" paint-order="stroke fill"/>
    <path d="..." fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="2" paint-order="stroke fill"/>
    <path d="..." fill="{{foregroundColor}}"/>
  `
})
```

See [Symbol Config](./symbol-config.md) for the full list of token properties and the SVG structure convention.

---

### `getSymbolDef(style)`

Returns the symbol definition for a marker or dataset style (`symbol` or `symbolSvgContent`), sized for its `symbolSize` — with the `viewBox` and `anchor` for that size. Pass the result to the `resolve` methods.

---

### `getSizedSymbolDef(symbolDef, { viewBox, symbolSize, anchor })`

Sizes a definition from [`get()`](#getid) (or `{ svg }` for inline content) directly. `viewBox` only applies to SVG-template symbols; `anchor` is as described in [Symbol Config: `anchor`](./symbol-config.md#anchor).

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

### `resolve(symbolDef, styleColors, mapStyle)`

Resolves a symbol's SVG for **normal (unselected, inactive) rendering**. Both `{{selectedColor}}` and `{{activeColor}}` are replaced with `'none'`, so neither ring is visible.

```js
const svg = services.symbolRegistry.resolve(
  services.symbolRegistry.getSymbolDef({ symbol: 'pin', symbolSize: 'large' }),
  { backgroundColor: '#d4351c' },
  mapStyle
)
```

---

### `resolveActive(symbolDef, styleColors, mapStyle)`

Resolves a symbol's SVG for **active (keyboard cursor) rendering**. Both `{{selectedColor}}` and `{{activeColor}}` are live — the committed ring and the focus ring are both visible simultaneously, so an active item always shows both rings regardless of whether it is also selected.

```js
const svg = services.symbolRegistry.resolveActive(
  services.symbolRegistry.get('pin'),
  { backgroundColor: '#d4351c' },
  mapStyle
)
```

---

### `resolveSelected(symbolDef, styleColors, mapStyle)`

Resolves a symbol's SVG for **committed-selection rendering**. `{{selectedColor}}` is live (the black committed ring is visible) but `{{activeColor}}` is forced to `'none'` — use this when an item is selected but not the current keyboard cursor.

```js
const svg = services.symbolRegistry.resolveSelected(
  services.symbolRegistry.get('pin'),
  { backgroundColor: '#d4351c' },
  mapStyle
)
```
