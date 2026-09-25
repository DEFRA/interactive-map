# PluginContext

Plugin components and callbacks receive the base [Context](../api/context.md) plus the plugin-specific properties documented below.

PluginContext is received by:
- [InitComponent](./plugin-manifest.md#initcomponent) - as props
- [API methods](./plugin-manifest.md#api) - as the first argument
- [Panel render components](../api/panel-definition.md#render) - as props
- [Control render components](../api/control-definition.md#render) - as props
- [Button callbacks](../api/button-definition.md) (`onClick`, `enableWhen`, `hiddenWhen`, `excludeWhen`, `pressedWhen`) - as an argument (`onClick` receives event first, context second)

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

Plugin-specific configuration. Contains all properties from the [PluginDescriptor](./plugin-descriptor.md) except `id` and `load`.

When using the factory function pattern, any options passed to the factory become available here:

```js
// When registering:
createScaleBarPlugin({ units: 'imperial' })

// Within the plugin:
const { units } = context.pluginConfig
```

See [Creating a Plugin Descriptor](./plugin-descriptor.md#creating-a-plugin-descriptor) for the full pattern.

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

---

### `setExclusiveControl`
**Type:** `(value: boolean | string | null) => void`

Available to plugin components (InitComponent, panel and control render components) as a prop.

Tells the app that your plugin has taken control of the interface, e.g. while a search form is expanded. You don't pass your plugin's id: it's added for you.

- `setExclusiveControl(true)` adds `im-o-app--exclusive-control-{pluginId}` to the app root.
- `setExclusiveControl('some-name')` adds `im-o-app--exclusive-control-{pluginId}--some-name` instead. The name is used as-is, so pass something class-safe.
- `setExclusiveControl(false)` (or `null`/`undefined`) releases your claim.

Only one class is ever present, for the most recent claim. Claims stack: if another plugin claims control while yours holds it, its class replaces yours, and when it releases, your class comes back. Releasing only removes your own claim, so it never affects another plugin's. Each plugin holds one claim at a time, so claiming with a new name replaces your previous one rather than stacking on it. Release in your effect's cleanup too, so a claim isn't left behind if your component unmounts.

Your plugin's own CSS decides what to hide in response, so it can pick what suits its focus behaviour. For example, it could use `opacity: 0` to keep hidden buttons in the tab order, or `display: none` to free up their space.

```js
// Claim while expanded; release when collapsed or unmounted
useLayoutEffect(() => {
  setExclusiveControl(isExpanded)
  return () => setExclusiveControl(false)
}, [isExpanded])
```

```scss
.im-o-app--exclusive-control-my-plugin {
  .im-o-app__right .im-c-button-wrapper {
    display: none;
  }
}
```
