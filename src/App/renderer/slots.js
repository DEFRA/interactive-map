// src/core/renderers/slots.js
export const layoutSlots = Object.freeze({
  SIDE: 'side',
  BANNER: 'banner',
  TOP_LEFT: 'top-left',
  TOP_MIDDLE: 'top-middle',
  TOP_RIGHT: 'top-right',
  INSET: 'inset',
  LEFT_TOP: 'left-top',
  LEFT_BOTTOM: 'left-bottom',
  MIDDLE: 'middle',
  RIGHT_TOP: 'right-top',
  RIGHT_BOTTOM: 'right-bottom',
  FOOTER_RIGHT: 'footer-right',
  BOTTOM: 'bottom',
  ACTIONS: 'actions',
  MODAL: 'modal' // internal only
})

export const allowedSlots = Object.freeze({
  control: [
    layoutSlots.BANNER,
    layoutSlots.TOP_LEFT,
    layoutSlots.TOP_RIGHT,
    layoutSlots.INSET,
    layoutSlots.MIDDLE,
    layoutSlots.FOOTER_RIGHT,
    layoutSlots.BOTTOM,
    layoutSlots.ACTIONS
  ],
  panel: [
    layoutSlots.SIDE,
    layoutSlots.BANNER,
    layoutSlots.INSET, // Deprecate
    layoutSlots.LEFT_TOP,
    layoutSlots.LEFT_BOTTOM,
    layoutSlots.MIDDLE,
    layoutSlots.RIGHT_TOP,
    layoutSlots.RIGHT_BOTTOM,
    layoutSlots.BOTTOM, // Typicaly on mobile
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
    layoutSlots.ACTIONS
  ]
})
