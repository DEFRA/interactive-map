# Symbol Registry

The symbol registry is a service that manages reusable named symbols for map markers. It is available to plugin authors via `services.symbolRegistry`.

> **Application code** that needs a one-off custom marker should pass [`symbolSvgContent`](./symbol-config.md#symbolsvgcontent) directly to `addMarker()` via `MarkerOptions` instead — no registration required.

## Built-in symbols

Two symbols are registered by default:

| ID | Anchor | Description |
|----|--------|-------------|
| `'pin'` | `[0.5, 1]` | Teardrop pin — tip aligns with the coordinate |
| `'circle'` | `[0.5, 0.5]` | Filled circle — centre aligns with the coordinate |

Both use the standard `{{token}}` placeholders and respect the resolution order described in [Symbol Config](./symbol-config.md#how-values-are-resolved).

## Methods

Available on `services.symbolRegistry` inside a plugin.

---

### `setDefaults(defaults)`

Set constructor-level defaults. Called automatically during app initialisation with the `symbolDefaults` constructor config. Plugin authors do not normally need to call this.

---

### `getDefaults()`

Returns the merged app-wide defaults (hardcoded `symbolDefaults.js` + constructor overrides).

```js
const defaults = services.symbolRegistry.getDefaults()
// { symbol: 'pin', backgroundColor: '#ca3535', selectedColor: { outdoor: '#0b0c0c', dark: '#ffffff' }, ... }
```

---

### `register(symbolDef)`

Register a custom symbol. Once registered it can be referenced by ID via `MarkerOptions.symbol` or a dataset `style.symbol`.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique symbol identifier |
| `svg` | `string` | Yes | Inner SVG path content with `{{token}}` placeholders — see [SVG structure](./symbol-config.md#svg-structure) |
| `viewBox` | `string` | Yes | SVG viewBox, e.g. `'0 0 38 38'` |
| `anchor` | `[number, number]` | Yes | Normalised [x, y] anchor point |
| *(token)* | `string \| Record<string, string>` | No | Default token value for this symbol, e.g. `backgroundColor: '#1d70b8'`. `selectedColor` and `selectedWidth` are ignored here — set them via constructor `symbolDefaults`. |

```js
services.symbolRegistry.register({
  id: 'star',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
  backgroundColor: '#1d70b8',
  svg: `
    <path d="..." fill="none" stroke="{{selectedColor}}" stroke-width="{{selectedWidth}}"/>
    <path d="..." fill="{{backgroundColor}}" stroke="{{haloColor}}" stroke-width="{{haloWidth}}"/>
    <path d="..." fill="{{foregroundColor}}"/>
  `
})
```

See [Symbol Config](./symbol-config.md) for the full list of token properties and the SVG structure convention.

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

Resolves a symbol's SVG for **normal (unselected) rendering**. The `{{selectedColor}}` token is always replaced with an empty string — the selection ring is structurally present but invisible.

```js
const svg = services.symbolRegistry.resolve(
  services.symbolRegistry.get('pin'),
  { backgroundColor: '#d4351c' },
  'outdoor'
)
```

---

### `resolveSelected(symbolDef, styleColors, mapStyleId)`

Resolves a symbol's SVG for **selected rendering**. The `{{selectedColor}}` token uses the cascade value. Use this when rendering the highlight layer for an interact or datasets selection.

```js
const svg = services.symbolRegistry.resolveSelected(
  services.symbolRegistry.get('pin'),
  { backgroundColor: '#d4351c' },
  'outdoor'
)
```
