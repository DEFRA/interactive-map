import { getSnapInstance, isSnapEnabled, triggerSnapAtPoint, getSnapLngLat } from './snapHelpers.js'

// Shared by editPointMode/touchHandlers.js and editVertexMode/touchHandlers.js — the offset-
// drag math (touch position → target/coordinate deltas, then delta → snapped map coordinate)
// is identical for both, since it's already single-coordinate, not ring-specific. Only what's
// dragged (state.touchPointTarget/movePoint vs state.touchVertexTarget/moveVertex) differs,
// which stays local to each mode's own touchHandlers.

export const getTouchPoint = (e) => ({ x: e.touches[0].clientX, y: e.touches[0].clientY })

// touchstart-time anchoring: the fixed offset between the finger and both the visible touch
// target and the underlying map coordinate, so onTouchmove can re-derive each from the
// finger's current position without drifting off its grab point.
export const computeTouchDragAnchors = (map, targetEl, touch, coord, scale) => {
  const style = window.getComputedStyle(targetEl)
  const deltaTarget = { x: touch.x - Number.parseFloat(style.left), y: touch.y - Number.parseFloat(style.top) }
  const coordPt = map.project(coord)
  const deltaVertex = { x: (touch.x / scale) - coordPt.x, y: (touch.y / scale) - coordPt.y }
  return { deltaTarget, deltaVertex }
}

// Resolves the current touch position (given the deltas computed above) to a map coordinate,
// honouring snap — the mid-drag counterpart to computeTouchDragAnchors' touchstart-time setup.
export const resolveTouchDragCoord = (map, state, touch) => {
  const screenPt = { x: (touch.x / state.scale) - state.deltaVertex.x, y: (touch.y / state.scale) - state.deltaVertex.y }
  let finalCoord = map.unproject(screenPt)
  if (isSnapEnabled(state)) {
    const snap = getSnapInstance(map)
    triggerSnapAtPoint(snap, map, screenPt)
    finalCoord = getSnapLngLat(snap) || finalCoord
  }
  return finalCoord
}
