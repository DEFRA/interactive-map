# Slots

Slots are named regions in the UI where buttons, controls, and panels can be placed. The slot system enables responsive layouts by allowing elements to appear in different locations at different breakpoints.

## Slot Map

<img src="/interactive-map/images/slot-map.svg" alt="Slot map showing the position of each named slot in the UI layout" width="838" />

`banner` appears at the top of the map on mobile and tablet. On desktop it moves into the `top-middle` slot.

`drawer` is typically used on mobile. At tablet and desktop breakpoints, panels assigned to `drawer` automatically fall back to `left-top`.

## Available Slots

| Slot | Typical use |
|---|---|
| `top-left` | Buttons and controls. Typically the search control on tablet and desktop |
| `top-middle` | Buttons and controls for optional actions |
| `top-right` | Buttons and controls. Typically the search button on mobile |
| `banner` | Tips, notifications, and context messages. Full width on mobile and tablet; rendered in the `top-middle` slot on desktop |
| `left-top` | Panels stacked on the left side (upper) |
| `left-bottom` | Panels stacked on the left side (lower) |
| `right-top` | Panels stacked on the right side (upper) |
| `right-bottom` | Panels stacked on the right side (lower) |
| `bottom-right` | Buttons and controls in the bottom-right corner |
| `middle` | Overlays centred on the map (e.g. loading screens or keyboard controls). Typically modal, as these will obscure map content |
| `drawer` | Full-width drawer below the map — typically for mobile panels |
| `actions` | Full width at the bottom of the screen on mobile. On tablet or desktop, a floating control at the bottom of the map area |
| `side` | Persistent side panel alongside the map |

## Slot Eligibility

Not all element types can use every slot. The table below shows which slots are available for each element type.

| Slot | Buttons | Panels | Controls |
|---|:---:|:---:|:---:|
| `top-left` | ✓ | | ✓ |
| `top-middle` | ✓ | | |
| `top-right` | ✓ | | ✓ |
| `banner` | | ✓ | ✓ |
| `left-top` | ✓ | ✓ | |
| `left-bottom` | ✓ | ✓ | |
| `right-top` | ✓ | ✓ | |
| `right-bottom` | ✓ | ✓ | |
| `bottom-left` | ✓ | | |
| `bottom-right` | ✓ | | ✓ |
| `middle` | | ✓ | ✓ |
| `drawer` | | ✓ | ✓ |
| `actions` | ✓ | | ✓ |
| `side` | | ✓ | |

## Usage

Specify a slot in the breakpoint configuration for buttons, controls, or panels:

```js
{
  mobile: { slot: 'drawer' },
  tablet: { slot: 'left-top' },
  desktop: { slot: 'left-top' }
}
```

Different slots can be used at each breakpoint, allowing an element to reposition itself as the layout changes.

> [!NOTE]
> At tablet and desktop breakpoints, panels assigned to `drawer` automatically fall back to `left-top`.

## Ordering

Multiple elements can share the same slot. Panels and controls render in the order they were registered. For buttons, this can be overridden using the `order` property in the breakpoint configuration.

- **No order** (default) — button renders in registration order.
- **Positive integer** — position hint (1-based). A button with `order: 1` will appear first; `order: 2` second, and so on.

```js
{
  desktop: { slot: 'left-top', order: 1 }
}
```

> [!NOTE]
> Order values are clamped to the valid range. If you specify an order larger than the number of buttons in the slot, the button is placed last.

When buttons belong to a group, `order` controls position within the group. The group itself is positioned in the slot using `group.order`.

## Button-Adjacent Panels

A panel can be configured to appear adjacent to the button that opened it by using a button-adjacent slot name:

```js
{
  desktop: { slot: 'map-styles-button' }
}
```

The slot name is the button's `id` converted to kebab-case, followed by `-button`. For example, a button with `id: 'mapStyles'` uses the slot `map-styles-button`. The panel will be positioned next to the triggering button in the DOM.

## Modal Panels

Setting `modal: true` in a panel's breakpoint config adds modal behaviour to the panel. Internally the panel is moved to a dedicated modal slot to ensure correct stacking order, but it is visually positioned to match its configured slot — for example, a button-adjacent panel will still appear next to its button — and gains a greyed-out backdrop, constrained keyboard focus, and other modal semantics.

```js
{
  desktop: { slot: 'map-styles-button', modal: true }
}
```

Only one modal panel can be visible at a time. If multiple modals are open, only the most recently opened one is shown.
