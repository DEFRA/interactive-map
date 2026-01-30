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

Accessible label. Text or a function returning text. Used for the button label or tooltip if `showLabel` is false.

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
**Type:** `string`

Button group label for grouping related buttons.

---

### `panelId`
**Type:** `string`

Associated panel identifier. When set, clicking the button toggles the panel open/closed.

---

### `onClick`
**Type:** `function`

Click handler for the button. Receives the event and [PluginContext](./plugin-context.md).

```js
onClick: (event, context) => {
  console.log('Button clicked')
}
```

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

## Breakpoint Configuration

Each breakpoint (`mobile`, `tablet`, `desktop`) accepts the following properties:

### `slot`
**Type:** `string`
**Required**

The [slot](./slots.md) where the button should appear at this breakpoint. Slots are named regions in the UI layout.

### `order`
**Type:** `number`

The order the button appears within its slot.

### `showLabel`
**Type:** `boolean`

Whether to show the label. If `false`, a tooltip is generated from the label instead.
