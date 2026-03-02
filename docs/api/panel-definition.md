# PanelDefinition

Defines a panel that can be rendered in the UI at various breakpoints.

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique panel identifier. Use this ID to associate a button with the panel via the `panelId` property.

---

### `label`
**Type:** `string`
**Required**

Accessible label. Used as the panel heading.

---

### `mobile`
**Type:** `PanelBreakpointConfig`
**Required**

Mobile breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `tablet`
**Type:** `PanelBreakpointConfig`
**Required**

Tablet breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `desktop`
**Type:** `PanelBreakpointConfig`
**Required**

Desktop breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `render`
**Type:** `ComponentType`

A React/Preact component to render as the panel content. Receives [Context](./context.md) as props (or [PluginContext](../plugins/plugin-context.md) when used in a plugin manifest).

```jsx
const MyPanelContent = ({ context }) => {
  const { pluginState } = context
  return <div>Panel content here</div>
}
```

> [!NOTE]
> Use `render` when defining panels in a plugin manifest. For API methods like `addPanel()`, use `html` instead.

---

### `html`
**Type:** `string`

HTML content to render in the panel.

> [!NOTE]
> Use `html` when adding panels via API methods like `addPanel()`. For plugin manifests with dynamic content, use `render` instead.

---

## Breakpoint Configuration

Each breakpoint (`mobile`, `tablet`, `desktop`) accepts the following properties:

### `slot`
**Type:** `string`
**Required**

The [slot](./slots.md) where the panel should appear at this breakpoint. Slots are named regions in the UI layout.

### `dismissable`
**Type:** `boolean`

Whether the panel can be dismissed (closed) by the user. When `false` and `open` is `true`, the panel is always visible at this breakpoint and any associated panel-toggle button is automatically suppressed.

### `exclusive`
**Type:** `boolean`

Whether the panel is exclusive. An exclusive panel will hide other panels when it becomes visible.

### `open`
**Type:** `boolean`

Whether the panel is open. When `true` and combined with `dismissable: false`, the panel is always visible at this breakpoint and will be restored automatically when the breakpoint is entered.

### `showLabel`
**Type:** `boolean`
**Default:** `true`

Whether to show the panel heading. If `false`, the heading is visually hidden but remains accessible to screen readers.

### `modal`
**Type:** `boolean`

Whether the panel is modal. A modal panel overlays the map and requires user interaction to dismiss.

### `width`
**Type:** `string`

Panel width. Accepts any valid CSS width value (e.g., `'300px'`, `'50%'`).
