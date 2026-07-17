# ButtonDefinition

Defines a button that can be rendered in the UI at various breakpoints.

## Properties

---

### `id`
**Type:** `string`
**Required**

Unique button identifier.

---

### `label`
**Type:** `string | function`
**Required**

Accessible label. Used for the button label or tooltip if `showLabel` is false. Can be a string or a function that returns a string. If a function is used, it receives the [Context](./context.md) as an argument.

```js
label: (context) => context.appState.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'
```

---

### `mobile`
**Type:** `ButtonBreakpointConfig`
**Required**

Mobile breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `tablet`
**Type:** `ButtonBreakpointConfig`
**Required**

Tablet breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `desktop`
**Type:** `ButtonBreakpointConfig`

Desktop breakpoint configuration. See [Breakpoint Configuration](#breakpoint-configuration) below.

---

### `iconId`
**Type:** `string`

Icon identifier from the icon registry.

---

### `iconSvgContent`
**Type:** `string`

Raw SVG content for the button icon. The outer `<svg>` tag should be excluded.

---

### `group`
**Type:** `{ name: string, label?: string, order?: number }`

Groups this button with other buttons that share the same `name`. Two or more buttons sharing a group are rendered inside a semantic `<div role="group">` wrapper, collapsing their visual borders into a single grouped unit.

- **`name`** — Internal identifier used to collect group members. Buttons with the same `name` are grouped together.
- **`label`** — Accessible label for the group, announced by screen readers. Defaults to `name` if not provided. Should be a short human-readable description (e.g. `'Zoom controls'`).
- **`order`** — The group's position within its slot, equivalent to the `order` property on singleton buttons. All buttons in the same group must share the same value. Defaults to `0`.

```js
// Two buttons rendered as a labelled group at slot position 2
{ group: { name: 'zoom', label: 'Zoom controls', order: 2 }, ... }
```

The `order` property on each button's breakpoint config (e.g. `desktop.order`) controls the button's position *within* the group when an explicit sequence is needed. If omitted, buttons appear in their declaration order.

> If only one button declares a given group name, it is rendered as a standalone button and the group wrapper is not created.

---

### `panelId`
**Type:** `string`

Associated panel identifier. When set, clicking the button toggles the panel open/closed.

---

### `ariaControls`
**Type:** `string | function`

Id of a custom control this button toggles, applied as `aria-controls`. Use when the button opens or expands a custom control rendered elsewhere by the plugin. Can be a string or a function that receives the [Context](./context.md) and returns the id.

```js
ariaControls: (context) => `${context.appConfig.id}-search-form`
```

> Pair this with [`expandedWhen`](#expandedwhen) to also reflect the open/closed state via `aria-expanded`.

---

### `keepFocus`
**Type:** `boolean`
**Default:** `false`

When `true`, focus remains on the button after activation rather than moving elsewhere.

- For **action buttons** (with `onClick`): focus stays on the button instead of returning to the map viewport.
- For **panel buttons** (with `panelId`): focus stays on the button instead of moving to the panel. The panel still opens.

Useful for buttons the user may press repeatedly (e.g. zoom controls), or to keep focus on a visible trigger while a panel opens alongside it.

Toggle buttons (`isPressed` / `pressedWhen`) always keep focus regardless of this flag.

```js
// Zoom — may be pressed repeatedly; keep focus on button
{ id: 'zoomIn', keepFocus: true, onClick: () => map.zoomIn() }

// Panel trigger — panel opens but focus stays on button
{ id: 'layers', keepFocus: true, panelId: 'layerPanel' }
```

> To apply this behaviour for all buttons that open a given panel, set [`focus: false`](./panel-definition.md#focus) on the panel definition instead.

---

### `menuItems`
**Type:** `MenuItemDefinition[]`

Array of items to render in a popup menu when the button is clicked. When provided, the button acts as a menu trigger (`aria-haspopup`) rather than invoking `onClick` directly.

Each item is a `MenuItemDefinition`. See [Menu item properties](#menu-item-properties) below.

```js
menuItems: [
  { id: 'opt-a', label: 'Option A', onClick: (e) => console.log('A') },
  { id: 'opt-b', label: 'Option B', onClick: (e) => console.log('B') }
]
```

Items whose `isPressed` or `pressedWhen` is set are rendered as `menuitemcheckbox` and support a checked state. Plain items are rendered as `menuitem`.

Menu item state (`hidden`, `disabled`, `pressed`) can be controlled at runtime via [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value) using the item's `id`.

---

### `inline`
**Type:** `boolean`
**Default:** `true`

Whether the button is rendered when the app is in 'inline' mode. Set to `false` to only show the button when fullscreen.

---

### `isPressed`
**Type:** `boolean`

Initial pressed state of the button. Sets `aria-pressed` when provided. Use [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value) to update at runtime.

Intended for host buttons added via `addButton()`. For plugin buttons, use the reactive `pressedWhen` callback instead.

---

### `isDisabled`
**Type:** `boolean`

Initial disabled state of the button. Sets `aria-disabled` when `true`. Use [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value) to update at runtime.

---

### `isHidden`
**Type:** `boolean`

Initial hidden state of the button. Sets `display: none` when `true`. Use [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value) to update at runtime.

---

### `onClick`
**Type:** `function`

Click handler for the button. Receives the event and [Context](./context.md).

```js
onClick: (event, context) => {
  console.log('Button clicked')
}
```

---

## Reactive Callbacks

The following callbacks are evaluated automatically for plugin-defined buttons only. When adding buttons via the host API (`addButton`), use [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value) to control these states imperatively.

---

### `enableWhen`
**Type:** `function`

Callback to determine if the button should be enabled. Returns `true` or `false`. Sets `aria-disabled` accordingly.

```js
enableWhen: (context) => context.pluginState.isReady
```

---

### `excludeWhen`
**Type:** `function`

Callback to determine if the button should be excluded from rendering entirely.

```js
excludeWhen: (context) => !context.appState.hasPermission
```

---

### `hiddenWhen`
**Type:** `function`

Callback to determine if the button should be hidden. Sets `display: none` if true.

```js
hiddenWhen: (context) => context.pluginState.isHidden
```

---

### `pressedWhen`
**Type:** `function`

Callback to determine if the button should appear pressed. Sets `aria-pressed` accordingly.

```js
pressedWhen: (context) => context.pluginState.isActive
```

---

### `expandedWhen`
**Type:** `function`

Callback to determine if the button should appear expanded. Sets `aria-expanded` accordingly. Typically used for buttons that control collapsible content other than a panel.

```js
expandedWhen: (context) => context.pluginState.isExpanded
```

---

## Breakpoint Configuration

Each breakpoint (`mobile`, `tablet`, `desktop`) accepts the following properties:

---

### `slot`
**Type:** `string`
**Required**

The [slot](./slots.md) where the button should appear at this breakpoint. Slots are named regions in the UI layout.

---

### `order`
**Type:** `number`

For **ungrouped buttons**, this is the button's position within its slot.

For **grouped buttons**, this is the button's position *within its group*. The group's position within the slot is controlled by `group.order` instead. If omitted, buttons appear in their declaration order within the group.

---

### `showLabel`
**Type:** `boolean`
**Default:** `true`

Whether to show the label. If `false`, a tooltip is generated from the label instead.

---

## Menu item properties

Each object in a button's `menuItems` array supports the following properties:

---

### `id`
**Type:** `string`
**Required**

Unique identifier for the menu item. Used to control item state via [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value).

---

### `label`
**Type:** `string`
**Required**

Display text for the item.

---

### `onClick`
**Type:** `function`

Click handler. Receives the native event as its only argument.

```js
onClick: (event) => console.log('Item clicked')
```

---

### `iconId`
**Type:** `string`

Icon identifier from the icon registry.

---

### `iconSvgContent`
**Type:** `string`

Raw SVG content for the item icon. The outer `<svg>` tag should be excluded.

---

### `isPressed`
**Type:** `boolean`

Initial checked state of the item. When set, the item renders as `menuitemcheckbox` with `aria-checked` reflecting the pressed state. Use [`toggleButtonState()`](../api.md#togglebuttonstateid-prop-value) with the item's `id` to update at runtime.

Intended for host buttons added via `addButton()`. For plugin buttons, use `pressedWhen` instead.

---

### `pressedWhen`
**Type:** `function`

Reactive callback to determine if the item should appear checked. When set, the item renders as `menuitemcheckbox`. Plugin buttons only.

```js
pressedWhen: (context) => context.pluginState.selectedOption === 'opt-a'
```

---

### `panelId`
**Type:** `string`

Associated panel identifier. When set, selecting the item opens the panel and moves focus to it. The item's `onClick` is not called.

---

### `keepFocus`
**Type:** `boolean`

When `true`, focus returns to the menu's trigger button after the item is selected, rather than moving to the panel (if `panelId` is set) or the map viewport.
