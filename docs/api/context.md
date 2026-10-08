# Context

Context object providing access to configuration, state, and services. This object is passed to various callbacks and components throughout the application.

## Properties

---

### `appConfig`
**Type:** `Object`

Application configuration passed to the InteractiveMap constructor.

---

### `appState`
**Type:** `Object`

Current application state, including:

```js
{
  breakpoint: 'mobile' | 'tablet' | 'desktop',
  interfaceType: 'mouse' | 'touch' | 'keyboard',
  // ... other app state
}
```

---

### `iconRegistry`
**Type:** `Object`

Registry of icons available for use in buttons and controls.

---

### `mapProvider`
**Type:** `MapProvider`

The map provider instance. Provides methods to interact with the underlying map engine.

```js
// Example usage
const center = context.mapProvider.getCenter()
context.mapProvider.setView({ zoom: 10 })
```

#### `mapProvider.addPatternsToMap(patternConfigs, mapStyleId, patternRegistry, pixelRatio)`

Rasterises and registers each pattern fill's image with the map engine. Images already registered are reused.

- `patternConfigs` — flat array of style configs that have a `fillPattern` or `fillPatternSvgContent` property
- `mapStyleId` — current map style ID
- `patternRegistry` — `services.patternRegistry`
- `pixelRatio` — optional; defaults to the map's current pixel ratio

```js
// In a plugin's layer adapter
await mapProvider.addPatternsToMap(patternConfigs, mapStyleId, services.patternRegistry)
```

On OpenLayers, `mapProvider.getPatternFill(imageId)` returns a registered pattern's `ol/style/Fill`, for a style function's `fill`.

---

#### `mapProvider.addSymbolsToMap(symbolConfigs, mapStyle, symbolRegistry, pixelRatio)`

Rasterises and registers each symbol's normal, active and selected images with the map engine. Images already registered are reused.

- `symbolConfigs` — flat array of style configs that have a `symbol` or `symbolSvgContent` property
- `mapStyle` — current map style config, used to resolve style-variant token values and ring colours
- `symbolRegistry` — `services.symbolRegistry`
- `pixelRatio` — optional; defaults to the map's current pixel ratio

```js
// In a plugin's layer adapter
await mapProvider.addSymbolsToMap(symbolConfigs, mapStyle, services.symbolRegistry)
```

`mapProvider.getActiveSymbolImageId(imageId)` and `mapProvider.getSelectedSymbolImageId(imageId)` return the image id of a registered symbol's active (keyboard cursor) and selected variants.

---

### `mapState`
**Type:** `Object`

Current map state, including:

```js
{
  zoom: 8,
  center: [-1.5, 52.5],
  bounds: [...],
  // ... other map state
}
```

---

### `services`
**Type:** `Object`

Core services for interacting with the application.

#### `announce`

Updates the map's `aria-live` region with a screen reader announcement. Use this to communicate important state changes to assistive technology users.

> [!NOTE]
> This will override any pending core messages, so be sure to include necessary context. This function is experimental and subject to change.

```js
context.services.announce('3 results found')
```

#### `focusMap`

Moves focus to the map viewport. An optional `message` replaces the viewport's accessible name (`mapLabel`), so screen readers speak it as part of the focus announcement. The original name returns when focus leaves the map. While it is set, the automatic map move announcement ("New area approximately…") is skipped until the user next presses a key or pointer on the map.

| Option | Type | Description |
|--------|------|-------------|
| `message` | `string` | Optional text read out in place of the map's name when it receives focus, e.g. the result of the action that moved focus |

```js
context.services.focusMap({ message: 'Map moved to Carlisle' })
```

#### `reverseGeocode`

Returns a location description for the given coordinates. Uses the `reverseGeocodeProvider` if configured in options.

```js
const description = await context.services.reverseGeocode(zoom, center)
// e.g. "Manchester, Greater Manchester"
```

> [!NOTE]
> Further work is planned to provide richer results with optional detail levels and zoom-dependent descriptions.

#### `closeApp`

Closes the map if in fullscreen mode and returns to the previous page. Use this when your interaction needs to exit the map entirely.

```js
context.services.closeApp()
```

#### `symbolRegistry`

Registry of named symbol definitions. Use this to register custom symbols that can be referenced by name in dataset or feature configs.

See [Symbol Registry](./symbol-registry.md) for full documentation.

---

#### `patternRegistry`

Registry of named fill pattern definitions. Built-in patterns (`'dot'`, `'cross-hatch'`, `'diamond'`, etc.) are pre-registered. Use this to register custom named patterns that can be shared across plugins.

```js
context.services.patternRegistry.register('my-hatch', '<path d="M0 0L16 16" stroke="{{foregroundColor}}"/>')
```

Patterns authored in a 16×16 coordinate space. Use `{{foregroundColor}}` and `{{backgroundColor}}` tokens for colour injection.

---

#### `eventBus`

Pub/sub event bus for communication within the application.

```js
const { eventBus } = context.services

// Subscribe to an event
eventBus.on('map:panel-opened', ({ panelId }) => {
  console.log('Panel opened:', panelId)
})

// Unsubscribe from an event
eventBus.off('map:panel-opened', handler)

// Emit an event
eventBus.emit('my-plugin:custom-event', { data: 'value' })
```

See [Events](../api.md#events) for available event name constants.

---

#### `getPlugin`

Looks up another registered plugin by id and returns its instance — the same
object its factory returned (e.g. what `createDrawPlugin()` gave the host
app), so you can call its API methods directly.

```js
const drawPlugin = context.services.getPlugin('draw')
drawPlugin?.newPolygon('boundary', { onGeometryChange: () => true })
```

Returns `undefined` if no plugin with that id is registered — a host app is
always free to omit an optional dependency, so treat the result as possibly
absent rather than erroring.

> [!NOTE]
> Finding a plugin isn't the same as it being safe to call — its methods bind
> once that plugin has mounted, and some need further setup after that. Hold
> onto the reference early if you like, but gate the actual call on that
> plugin's own readiness convention where one exists, e.g. `draw:ready` on
> `eventBus` before calling anything on `getPlugin('draw')`.
