# ControlDefinition

Defines a custom control component that can be rendered in the UI at various breakpoints.

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique control identifier.

---

### `label`
**Type:** `string`
**Required**

Accessible label for the control.

---

### `render`
**Type:** `ComponentType`
**Required**

A React/Preact component to render. Receives [Context](./context.md) as props (or [PluginContext](../plugins/plugin-context.md) when used in a plugin manifest).

```jsx
const MyControl = ({ context }) => {
  const { appState, pluginState } = context
  return <div>Custom control content</div>
}
```

---

### `mobile`
**Type:** `ControlBreakpointConfig`
**Required**

Mobile breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `tablet`
**Type:** `ControlBreakpointConfig`
**Required**

Tablet breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `desktop`
**Type:** `ControlBreakpointConfig`
**Required**

Desktop breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

## Breakpoint Configuration

Each breakpoint (`mobile`, `tablet`, `desktop`) accepts the following properties:

### `slot`
**Type:** `string`
**Required**

The [slot](./slots.md) where the control should appear at this breakpoint. Slots are named regions in the UI layout. A control can also target a panel's body directly — including a panel registered by a different plugin — see [Panel-Injected Controls](./slots.md#panel-injected-controls).

---

### `order`
**Type:** `number`
**Optional**

Position within the slot (or, when targeting a panel, within that panel's body). See [Ordering](./slots.md#ordering).
