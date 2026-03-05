// src/core/renderers/slots.js
export const layoutSlots = Object.freeze({
  SIDE: 'side',
  BANNER: 'banner',
  TOP_LEFT: 'top-left',
  TOP_MIDDLE: 'top-middle',
  TOP_RIGHT: 'top-right',
  INSET: 'inset',
  RIGHT_TOP: 'right-top',
  RIGHT_BOTTOM: 'right-bottom',
  MIDDLE: 'middle',
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
    layoutSlots.INSET,
    layoutSlots.RIGHT_BOTTOM,
    layoutSlots.MIDDLE,
    layoutSlots.BOTTOM,
    layoutSlots.ACTIONS,
    layoutSlots.MODAL
  ],
  button: [
    layoutSlots.TOP_LEFT,
    layoutSlots.TOP_MIDDLE,
    layoutSlots.TOP_RIGHT,
    layoutSlots.RIGHT_TOP,
    layoutSlots.RIGHT_BOTTOM,
    layoutSlots.ACTIONS
  ]
})
