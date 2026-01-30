# PluginContext

Plugin components and callbacks receive the base [Context](../api/context.md) plus the plugin-specific properties documented below.

PluginContext is received by:
- [InitComponent](./plugin-manifest.md#initcomponent) - as props
- [API methods](./plugin-manifest.md#api) - as the first argument
- [Panel render components](./panel-definition.md#render) - as props
- [Control render components](./control-definition.md#render) - as props
- [Button callbacks](./button-definition.md) (`onClick`, `enableWhen`, `hiddenWhen`, `excludeWhen`, `pressedWhen`) - as an argument (`onClick` receives event first, context second)

## Base Context Properties

See [Context](../api/context.md) for the following properties available to all contexts:

- `appConfig` - Application configuration
- `appState` - Current application state
- `iconRegistry` - Icon registry
- `mapProvider` - Map provider instance
- `mapState` - Current map state
- `services` - Core services

## Plugin-Specific Properties

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
