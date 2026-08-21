import { CUSTOM_DRAW_EVENTS } from '../drawEvents.js'
import { getSnapInstance, clearSnapIndicator } from './snapHelpers.js'

// Builds the `handlers` map both modes' setupEventListeners bind to bindEditModeListeners —
// the base set of window/container/scale/move/interface-type-change handlers is identical
// in both, bound to whichever mode instance is passed in; `extra` supplies the handlers that
// differ per mode (nudge, plus edit_vertex's own selectionchange/update).
export const buildEditModeHandlers = (mode, state, extra = {}) => {
  const bind = (handler) => (event) => handler.call(mode, state, event)
  const handlers = {
    keydown: bind(mode.onKeydown),
    keyup: bind(mode.onKeyup),
    pointerdown: bind(mode.onPointerevent),
    pointermove: bind(mode.onPointerevent),
    pointerup: bind(mode.onPointerevent),
    click: bind(mode.onButtonClick),
    touchstart: bind(mode.onTouchstart),
    touchmove: bind(mode.onTouchmove),
    touchend: bind(mode.onTouchend),
    scalechange: bind(mode.onScaleChange),
    move: bind(mode.onMove),
    interfacetypechange: bind(mode.onInterfaceTypeChange)
  }
  for (const [name, handler] of Object.entries(extra)) {
    handlers[name] = bind(handler)
  }
  return handlers
}

// Shared DOM/map event wiring for edit_point and edit_vertex — both modes' setupEventListeners
// bind the exact same base set of window/container listeners plus scale/move/interface-type-
// change/nudge map events; edit_vertex additionally wires its own selectionchange/update map
// events on top of this. Each mode still builds its own `handlers` map (bound to its own onXxx
// methods) — this just wires/unwires it, keyed on the handler names both modes share (the
// nudge entry is named `nudge` in both, even though what it does — nudgePointByDelta vs
// nudgeVertexByDelta — differs per mode).
export const bindEditModeListeners = (state, map, handlers) => {
  window.addEventListener('keydown', handlers.keydown, { capture: true })
  window.addEventListener('keyup', handlers.keyup, { capture: true })
  window.addEventListener('click', handlers.click)
  state.container.addEventListener('pointerdown', handlers.pointerdown)
  state.container.addEventListener('pointermove', handlers.pointermove)
  state.container.addEventListener('pointerup', handlers.pointerup)
  state.container.addEventListener('touchstart', handlers.touchstart, { passive: false })
  state.container.addEventListener('touchmove', handlers.touchmove, { passive: false })
  state.container.addEventListener('touchend', handlers.touchend, { passive: false })
  map.on('draw.scalechange', handlers.scalechange)
  map.on('move', handlers.move)
  map.on(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, handlers.interfacetypechange)
  map.on(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, handlers.nudge)
}

// Mirrors bindEditModeListeners, plus the dragPan re-enable both modes' onStop does right
// alongside it (dragPan is disabled for the duration of the edit session elsewhere).
export const unbindEditModeListeners = (state, map, handlers) => {
  state.container.removeEventListener('pointerdown', handlers.pointerdown)
  state.container.removeEventListener('pointermove', handlers.pointermove)
  state.container.removeEventListener('pointerup', handlers.pointerup)
  state.container.removeEventListener('touchstart', handlers.touchstart)
  state.container.removeEventListener('touchmove', handlers.touchmove)
  state.container.removeEventListener('touchend', handlers.touchend)
  map.off('draw.scalechange', handlers.scalechange)
  map.off('move', handlers.move)
  map.off(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, handlers.interfacetypechange)
  map.off(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, handlers.nudge)
  map.dragPan.enable()
  window.removeEventListener('click', handlers.click)
  window.removeEventListener('keydown', handlers.keydown, { capture: true })
  window.removeEventListener('keyup', handlers.keyup, { capture: true })
}

// Clear any snap indicator left over from a previous interaction — both edit modes do this
// once, at onSetup.
export const clearActiveSnapIndicator = (map) => {
  const snap = getSnapInstance(map)
  if (snap) {
    clearSnapIndicator(snap, map)
  }
}
