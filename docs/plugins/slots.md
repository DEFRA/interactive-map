# Slots

Slots are named regions in the UI where buttons, controls, and panels can be placed. The slot system enables responsive layouts by allowing elements to appear in different locations at different breakpoints.

## Slot Map

<!-- TODO: Add visual diagram showing slot locations -->

## Available Slots

<!-- TODO: Document available slots and their positions -->

## Usage

Specify a slot in the breakpoint configuration for buttons, controls, or panels:

```js
{
  mobile: { slot: 'top-left' },
  tablet: { slot: 'top-left' },
  desktop: { slot: 'top-left' }
}
```

Elements in the same slot are rendered in order based on their `order` property (where supported).
