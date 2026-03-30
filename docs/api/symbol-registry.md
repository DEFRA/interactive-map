# Symbol Registry

The symbol registry is a service that manages reusable named symbols for map markers. It is available to plugin authors via `services.symbolRegistry`.

> **Application code** that needs a one-off custom marker should pass [`symbolSvgContent`](./marker-config.md#symbolsvgcontent) directly to `addMarker()` via `MarkerOptions` instead — no registration required.

## Built-in symbols

Two symbols are registered by default:

| ID | Anchor | Description |
|----|--------|-------------|
| `'pin'` | `[0.5, 1]` | Teardrop pin — tip aligns with the coordinate |
| `'circle'` | `[0.5, 0.5]` | Filled circle — centre aligns with the coordinate |

Both use the standard `{{token}}` placeholders and respect `symbolDefaults`.

## SVG structure

Symbols are defined as inner SVG path content (no `<svg>` wrapper) using `{{token}}` placeholders for colours and widths. The standard three-layer structure is:

```js
svg: `
  <path d="..." fill="none" stroke="{{selected}}" stroke-width="{{selectedWidth}}"/>
  <path d="..." fill="{{background}}" stroke="{{halo}}" stroke-width="{{haloWidth}}"/>
  <path d="..." fill="{{foreground}}"/>
`
```

- **Layer 1** — selection ring (stroke only, fill none)
- **Layer 2** — background shape with halo stroke
- **Layer 3** — foreground graphic (e.g. inner dot)

## Default token values

Defined in `symbolDefaults` and applied unless overridden at the usage site:

| Token | Default |
|-------|---------|
| `background` | `'#1d70b8'` |
| `foreground` | `'#ffffff'` |
| `halo` | `{ outdoor: '#ffffff', dark: '#0b0c0c' }` |
| `selected` | `'transparent'` |
| `haloWidth` | `'1'` |
| `selectedWidth` | `'6'` |

Color values may be a plain string or an object keyed by map style ID — the registry resolves the correct value for the current basemap automatically.

## Methods

Available on `services.symbolRegistry` inside a plugin.

---

### `register(symbolDef)`

Register a custom symbol. Once registered it can be referenced by ID in `MarkerOptions.symbol` and via `markerSymbol` in the map config.

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique symbol identifier |
| `svg` | `string` | Yes | Inner SVG path content with `{{token}}` placeholders |
| `viewBox` | `string` | Yes | SVG viewBox, e.g. `'0 0 38 38'` |
| `anchor` | `[number, number]` | Yes | Normalised [x, y] anchor point — `[0.5, 1]` is bottom-centre |

```js
// Inside a plugin's init or setup function:
services.symbolRegistry.register({
  id: 'star',
  viewBox: '0 0 38 38',
  anchor: [0.5, 0.5],
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

## Custom tokens

Any `{{token}}` placeholder in the SVG beyond the built-in set is substituted automatically if a matching key is passed in `MarkerOptions`. This lets custom symbols define their own colour slots:

```js
services.symbolRegistry.register({
  id: 'flag',
  viewBox: '0 0 38 38',
  anchor: [0, 1],
  svg: `<path d="..." fill="{{flagColor}}"/><path d="..." fill="{{poleColor}}"/>`
})

// When adding a marker:
markers.add('id', coords, { symbol: 'flag', flagColor: '#d4351c', poleColor: '#0b0c0c' })
```
