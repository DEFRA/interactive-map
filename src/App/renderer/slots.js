// src/core/renderers/slots.js
export const layoutSlots = Object.freeze({
  SIDE: 'side',
  BANNER: 'banner',
  TOP_LEFT: 'top-left',
  TOP_MIDDLE: 'top-middle',
  TOP_RIGHT: 'top-right',
  LEFT_TOP: 'left-top',
  LEFT_BOTTOM: 'left-bottom',
  MIDDLE: 'middle',
  RIGHT_TOP: 'right-top',
  RIGHT_BOTTOM: 'right-bottom',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_RIGHT: 'bottom-right',
  DRAWER: 'drawer',
  ACTIONS: 'actions',
  MODAL: 'modal' // internal only
})

export const allowedSlots = Object.freeze({
  control: [
    layoutSlots.BANNER,
    layoutSlots.TOP_LEFT,
    layoutSlots.TOP_RIGHT,
    layoutSlots.MIDDLE,
    layoutSlots.RIGHT_BOTTOM,
    layoutSlots.BOTTOM_RIGHT,
    layoutSlots.DRAWER,
    layoutSlots.ACTIONS
  ],
  panel: [
    layoutSlots.SIDE,
    layoutSlots.BANNER,
    layoutSlots.LEFT_TOP,
    layoutSlots.LEFT_BOTTOM,
    layoutSlots.MIDDLE,
    layoutSlots.RIGHT_TOP,
    layoutSlots.RIGHT_BOTTOM,
    layoutSlots.DRAWER, // Typically on mobile
    layoutSlots.MODAL // Internal only
  ],
  button: [
    layoutSlots.TOP_LEFT,
    layoutSlots.TOP_MIDDLE,
    layoutSlots.TOP_RIGHT,
    layoutSlots.LEFT_TOP,
    layoutSlots.LEFT_BOTTOM,
    layoutSlots.RIGHT_TOP,
    layoutSlots.RIGHT_BOTTOM,
    layoutSlots.BOTTOM_LEFT,
    layoutSlots.BOTTOM_RIGHT,
    layoutSlots.ACTIONS
  ]
})
