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

### `focus`
**Type:** `boolean`
**Default:** `true`

Whether to move focus to the panel when it opens. Set to `false` to prevent the panel from receiving focus — useful for panels present on page load, or informational panels that should not interrupt the user's current flow.

Modal panels always receive focus regardless of this setting.

```js
// Page load — panel visible immediately, no focus steal
map.addPanel('info', { focus: false, desktop: { slot: 'left-top' } })

// User-triggered — focus moves to panel (default)
map.addPanel('info', { desktop: { slot: 'left-top' } })
```

> For per-button control, set [`keepFocus: true`](./button-definition.md#keepfocus) on the triggering button instead. This prevents focus from moving to the panel for that specific button while other buttons that open the same panel still behave normally.

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

### `visibleGeometry`
**Type:** `object | function`

GeoJSON Feature, FeatureCollection or geometry to keep in view when the panel opens. Can be the GeoJSON, or a function that receives the [Context](./context.md) and returns it. The function is called each time the panel opens, however it opens, so it can return a shape that changes. If it returns nothing, the map doesn't move. If the panel opens over any part of it, the map pans to centre it in the safe zone, or zooms out to fit it if it doesn't fit at the current zoom. If it isn't under the panel, including when it's off screen, the map doesn't move.

Applies to panels in the left, right and drawer slots. Panels in other slots, and modal panels, don't move the map.

```js
// A plugin's panel keeping the shape being edited in view
visibleGeometry: ({ pluginState }) => pluginState.feature
```

---

### `preferPan`
**Type:** `boolean`
**Default:** `true`

Whether to pan rather than zoom to show `visibleGeometry`. With `false`, the map fits the geometry when the panel opens over it. See [`fitToBounds`](../api.md#fittoboundsbounds-options).

---

### `paddingPercent`
**Type:** `number | { top, right, bottom, left }`
**Default:** `0`

Space to keep around `visibleGeometry`, as a percentage of the safe zone's size. Left and right use its width, top and bottom its height. Limited to 0–25 on each side. See [`fitToBounds`](../api.md#fittoboundsbounds-options).

---

## Breakpoint Configuration

Each breakpoint (`mobile`, `tablet`, `desktop`) accepts the following properties:

### `slot`
**Type:** `string`
**Required**

The [slot](./slots.md) where the panel should appear at this breakpoint. Slots are named regions in the UI layout.

### `dismissible`
**Type:** `boolean`

Whether the panel can be dismissed (closed) by the user. When `false` and `open` is `true`, the panel is always visible at this breakpoint and any associated panel-toggle button is automatically suppressed.

### `exclusive`
**Type:** `boolean`

Whether the panel is exclusive. An exclusive panel will hide other panels when it becomes visible.

### `open`
**Type:** `boolean`

Whether the panel is open. When `true` and combined with `dismissible: false`, the panel is always visible at this breakpoint and will be restored automatically when the breakpoint is entered.

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

### `tab`
**Type:** `string`

Groups the panel's own content into a tab alongside any controls injected into it. Optional even once tabs are active — the panel's own content falls back to an implicit tab labelled with the panel's `label` when omitted. See [Panel Tabs](./slots.md#panel-tabs).
