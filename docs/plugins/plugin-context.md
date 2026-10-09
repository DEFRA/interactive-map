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

### `setApplicationMode`
**Type:** `(id: string, options?: { include?: string[], exclude?: string[] }) => void`

### `clearApplicationMode`
**Type:** `(id: string) => void`

Available to plugin components (InitComponent, panel and control render components) as props.

Application modes let your plugin change what the interface shows while it's in a particular state, e.g. draw while drawing or search while its form is open. Declare the mode and what it shows in your manifest's [`applicationModes`](./plugin-manifest.md#applicationmodes), then enter and leave it. Modes form a stack: `setApplicationMode(id)` puts a mode on top (or moves it to the top if it's already set), and `clearApplicationMode(id)` removes it, so the mode underneath takes over.

```js
// Enter the mode for as long as your plugin is in that state, and leave it on unmount too
useLayoutEffect(() => {
  if (!isDrawing) {
    return undefined
  }
  setApplicationMode('my-plugin')
  return () => clearApplicationMode('my-plugin')
}, [isDrawing])
```

Only the current mode, the top of the stack, applies: the app root gets `im-o-app--mode-{id}`, and its lists decide what's hidden. Pass `options` (`{ include, exclude }`) only to adjust the mode for one call; they're applied last, on top of the manifests and the host's config.

- Use your plugin's id as the mode id, or as a prefix for several modes (e.g. `'draw-polygon'`).
- One id can name several items, e.g. `mapStyles` is both the map styles button and its panel.
- Hidden items are hidden with `display: none`, not removed, so their state, scroll position and focus-return targets survive, and they reappear as they were when the mode ends. If focus was on something that's hidden, it moves to the map.
- Modal panels are never hidden, so focus can't get trapped in a hidden one.
- If another mode is set on top of yours, yours waits underneath and applies again once it's back on top.
- The host can add to, remove from or disable your mode with its [`applicationModes`](../api.md#applicationmodes) option. Document your mode's id so they can.
- Modes only change the interface. Your plugin's own behaviour, and other plugins', carries on as normal.

Use `include` (in your manifest) for a mode the user stays in until they end it (like drawing), where hidden items shouldn't be reachable with Tab. Use no lists, and hide things with your own CSS, when hidden items must stay focusable — for example if your UI closes when focus leaves it, as search does, so Tab can still move on to the next item:

```scss
.im-o-app--mode-my-plugin {
  .im-o-app__right .im-c-button-wrapper {
    opacity: 0;
  }
}
```
