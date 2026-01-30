# PluginContext

Context object passed to plugin callbacks and components, providing access to configuration, state, and services.

PluginContext is received by:
- [InitComponent](./plugin-manifest.md#initcomponent) - as props
- [API methods](./plugin-manifest.md#api) - as the first argument
- [Panel render components](./panel-definition.md#render) - as props
- [Control render components](./control-definition.md#render) - as props
- [Button callbacks](./button-definition.md) (`onClick`, `enableWhen`, `hiddenWhen`, `excludeWhen`, `pressedWhen`) - as an argument (`onClick` receives event first, context second)

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

See [MapProvider](./map-provider.md) for available methods.

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

### `pluginConfig`
**Type:** `Object`

Plugin-specific configuration passed when registering the plugin.

---

### `pluginState`
**Type:** `Object`

Plugin-specific state managed by the plugin's reducer, plus utilities for updating state.

```js
{
  // State values from your reducer's initialState
  isActive: false,

  // Dispatch function for updating plugin state
  dispatch: ({ type, payload }) => { /* ... */ }
}
```

```js
// Access state
const { isActive } = context.pluginState

// Update state
context.pluginState.dispatch({ type: 'setActive', payload: true })
```

> [!NOTE]
> The `dispatch` function is intended for advanced use cases where you need to update plugin state from within callbacks. In most cases, prefer managing state through your reducer actions triggered by user interactions.

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

#### `eventBus`

Pub/sub event bus for communication between plugins and the application.

```js
const { eventBus, events } = context.services

// Subscribe to an event
eventBus.on(events.APP_PANEL_OPENED, ({ panelId }) => {
  console.log('Panel opened:', panelId)
})

// Unsubscribe from an event
eventBus.off(events.APP_PANEL_OPENED, handler)

// Emit an event
eventBus.emit(events.MY_CUSTOM_EVENT, { data: 'value' })
```

#### `events`

Event name constants for use with `eventBus`. See [Events](../api.md#events) for available events.
