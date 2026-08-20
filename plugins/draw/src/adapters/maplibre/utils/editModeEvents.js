import { CUSTOM_DRAW_EVENTS } from '../drawEvents.js'
import { getSnapInstance, clearSnapIndicator } from './snapHelpers.js'

// Shared DOM/map event wiring for edit_point and edit_vertex — both modes' setupEventListeners
// bind the exact same base set of window/container listeners plus scale/move/interface-type-
// change/nudge map events; edit_vertex additionally wires its own selectionchange/update map
// events on top of this. Each mode still builds its own `handlers` map (bound to its own onXxx
// methods) — this just wires/unwires it, keyed on the handler names both modes share (the
// nudge entry is named `nudge` in both, even though what it does — nudgePointByDelta vs
// nudgeVertexByDelta — differs per mode).
export const bindEditModeListeners = (state, map, h) => {
  window.addEventListener('keydown', h.keydown, { capture: true })
  window.addEventListener('keyup', h.keyup, { capture: true })
  window.addEventListener('click', h.click)
  state.container.addEventListener('pointerdown', h.pointerdown)
  state.container.addEventListener('pointermove', h.pointermove)
  state.container.addEventListener('pointerup', h.pointerup)
  state.container.addEventListener('touchstart', h.touchstart, { passive: false })
  state.container.addEventListener('touchmove', h.touchmove, { passive: false })
  state.container.addEventListener('touchend', h.touchend, { passive: false })
  map.on('draw.scalechange', h.scalechange)
  map.on('move', h.move)
  map.on(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, h.interfacetypechange)
  map.on(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, h.nudge)
}

// Mirrors bindEditModeListeners, plus the dragPan re-enable both modes' onStop does right
// alongside it (dragPan is disabled for the duration of the edit session elsewhere).
export const unbindEditModeListeners = (state, map, h) => {
  state.container.removeEventListener('pointerdown', h.pointerdown)
  state.container.removeEventListener('pointermove', h.pointermove)
  state.container.removeEventListener('pointerup', h.pointerup)
  state.container.removeEventListener('touchstart', h.touchstart)
  state.container.removeEventListener('touchmove', h.touchmove)
  state.container.removeEventListener('touchend', h.touchend)
  map.off('draw.scalechange', h.scalechange)
  map.off('move', h.move)
  map.off(CUSTOM_DRAW_EVENTS.INTERFACE_TYPE_CHANGE, h.interfacetypechange)
  map.off(CUSTOM_DRAW_EVENTS.NUDGE_VERTEX, h.nudge)
  map.dragPan.enable()
  window.removeEventListener('click', h.click)
  window.removeEventListener('keydown', h.keydown, { capture: true })
  window.removeEventListener('keyup', h.keyup, { capture: true })
}

// Clear any snap indicator left over from a previous interaction — both edit modes do this
// once, at onSetup.
export const clearActiveSnapIndicator = (map) => {
  const snap = getSnapInstance(map)
  if (snap) {
    clearSnapIndicator(snap, map)
  }
}
