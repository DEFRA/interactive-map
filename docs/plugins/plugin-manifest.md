# PluginManifest

Manifest defining a plugin's buttons, panels, controls, icons, API methods, and state.

## Properties

---

### `api`
**Type:** `Object`

Public methods exposed by the plugin for external use. These methods can be called via the plugin instance:

```js
myPlugin.doSomething()
```

Each function receives a [PluginContext](./plugin-context.md) as its first argument, providing access to app state, map provider, services, and more. Additional arguments follow.

```js
{
  doSomething: (context) => {
    console.log(context.appState.breakpoint)
  },
  getValue: (context, id) => {
    return context.pluginState[id]
  }
}
```

---

### `buttons`
**Type:** `ButtonDefinition[]`

Button definitions to register in the UI.

Buttons come with pre-built behaviour and styling, including icon support, labels, tooltips, and pressed states. Supports responsive breakpoint configuration.

See [ButtonDefinition](./button-definition.md) for full details.

---

### `controls`
**Type:** `ControlDefinition[]`

Custom control definitions to register in the UI.

Use controls for bespoke UI elements that don't fit the button or panel pattern. Controls have no pre-built behaviour or styling—you have full control over rendering and interaction. Supports responsive breakpoint configuration.

See [ControlDefinition](./control-definition.md) for full details.

---

### `icons`
**Type:** `IconDefinition[]`

Icon definitions to register in the icon registry.

The icon registry is a singleton shared across all map instances and plugins. Registering an icon with an existing ID will override it. This enforces visual consistency across the application, including when multiple map instances exist on the same page.

See [IconDefinition](./icon-definition.md) for full details.

---

### `InitComponent`
**Type:** `ComponentType`

A React/Preact component rendered when the plugin loads. Use this for initialisation logic, side effects, or rendering hidden UI elements.

- Mounted once when the app loads
- Re-renders when [PluginContext](./plugin-context.md) state changes (e.g., `appState`, `pluginState`, `mapState`)
- Typically returns `null` if no visible UI is needed

```jsx
const InitComponent = ({ context }) => {
  const { appState, mapProvider, pluginState } = context

  useEffect(() => {
    // Run side effects when state changes
    console.log('Breakpoint:', appState.breakpoint)
  }, [appState.breakpoint])

  return null
}
```

---

### `panels`
**Type:** `PanelDefinition[]`

Panel definitions to register in the UI.

Panels come with pre-built behaviour and styling, including headings, dismissable states, and modal overlays. Supports responsive breakpoint configuration.

See [PanelDefinition](./panel-definition.md) for full details.

---

### `reducer`
**Type:** `Object`

Reducer configuration for plugin state management.

```js
{
  initialState: {
    isActive: false
  },
  actions: {
    setActive: (state, isActive) => ({
      ...state,
      isActive
    })
  }
}
```
