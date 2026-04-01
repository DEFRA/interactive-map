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

#### `mapProvider.registerPatterns(patternConfigs, mapStyleId, patternRegistry)`

Rasterises and registers pattern fill images with the map engine. Plugin layer adapters call this instead of importing provider internals directly, keeping cross-package boundaries clean.

- `patternConfigs` — flat array of dataset/sublayer configs that have a `fillPattern` or `fillPatternSvgContent` property (sublayer merging is the caller's responsibility)
- `mapStyleId` — current map style ID
- `patternRegistry` — the core pattern registry instance

```js
// In a plugin's MapLibre layer adapter
await mapProvider.registerPatterns(getPatternConfigs(datasets, patternRegistry), mapStyleId, patternRegistry)
```

---

#### `mapProvider.registerSymbols(symbolConfigs, mapStyleId, symbolRegistry)`

Rasterises and registers symbol images with the map engine. Plugin layer adapters call this instead of importing provider internals directly, keeping cross-package boundaries clean.

- `symbolConfigs` — flat array of dataset/sublayer configs that have a `symbol` property (sublayer merging is the caller's responsibility — use `getSymbolConfigs` from the datasets adapter or equivalent)
- `mapStyleId` — current map style ID, used to resolve style-variant token values
- `symbolRegistry` — the core symbol registry instance

```js
// In a plugin's MapLibre layer adapter
await mapProvider.registerSymbols(getSymbolConfigs(datasets), mapStyleId, symbolRegistry)
```

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
context.services.patternRegistry.register('my-hatch', '<path d="M0 0L16 16" stroke="{{foreground}}"/>')
```

Patterns authored in a 16×16 coordinate space. Use `{{foreground}}` and `{{background}}` tokens for colour injection.

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
