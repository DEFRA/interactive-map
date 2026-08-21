import { getSnapInstance, clearSnapState } from '../../utils/snapHelpers.js'
import { isOnSVG, scalePoint } from '../editVertexMode/helpers.js'
import { createTouchTarget } from '../../../../utils/touchTarget.js'
// Reused, not redefined — mapboxDraw.js's style-reload path already imports this same symbol
// and keys off map._drawEditContainer, which edit_point also sets, so the recolour-on-
// style-change path works for the point's touch target with zero changes elsewhere.
import { applyTouchVertexColors } from '../editVertexMode/touchHandlers.js'
import { getTouchPoint, computeTouchDragAnchors, resolveTouchDragCoord } from '../../utils/touchDragMath.js'

// The offset-drag delta math here (utils/touchDragMath.js) is shared with editVertexMode/
// touchHandlers.js's onTouchstart/onTouchmove — it's already single-coordinate, not
// ring-specific — just sourced from the point's own coordinate instead of a vertex list
// index. onTap does NOT relocate the point (a stray tap during a pan-ish gesture shouldn't
// silently move it — the offset target drag and the D-pad are touch's two ways to move it).
export const touchHandlers = {
  addTouchPointTarget (state) {
    state.touchPointTarget = createTouchTarget(state.container)
    applyTouchVertexColors(state.touchPointTarget, this.map._drawCurrentMapStyle, this.map._drawPluginConfig)
  },

  updateTouchPointTarget (state, point) {
    if (point && state.interfaceType === 'touch') {
      Object.assign(state.touchPointTarget.style, { display: 'block', top: `${point.y}px`, left: `${point.x}px` })
    } else {
      state.touchPointTarget.style.display = 'none'
    }
  },

  hideTouchPointIndicator (state) {
    state.touchPointTarget.style.display = 'none'
  },

  // Point is always selected, so — unlike editVertexMode's onPointerevent — there's nothing
  // to deselect on a non-touch pointermove; just track the interface type.
  onPointerevent (state, e) {
    state.interfaceType = e.pointerType === 'touch' ? 'touch' : 'mouse'
    state.isPanEnabled = true
  },

  // Empty stubs required by DirectSelect
  onTouchStart () {},
  onTouchMove () {},
  onTouchEnd () {},

  onTouchend (state) {
    clearSnapState(getSnapInstance(this.map))
    if (state._touchMoved && state._moveStartPosition) {
      this.pushUndo({ type: 'move_point', featureId: state.featureId, vertexIndex: 0, previousPosition: state._moveStartPosition })
    }
    state._moveStartPosition = null
    state._touchMoved = false

    // Re-sync the target to the point's actual final coordinate. Mid-drag it tracks the raw
    // finger 1:1 from its touchstart-time offset (see onTouchmove) — a mid-drag snap moves the
    // point without moving the target by the same amount, leaving them out of alignment. Left
    // uncorrected, the next onTouchstart's delta math re-anchors off that drifted position,
    // compounding a little further with every snapped drag.
    if (state.feature) {
      this.updateTouchPointTarget(state, scalePoint(this.map.project(state.feature.coordinates), state.scale))
    }
  },

  // Touch tap on the point does nothing — relocating it is the offset target drag or the
  // D-pad's job, not a raw tap.
  onTap () {},

  onTouchstart (state, e) {
    clearSnapState(getSnapInstance(this.map))
    const vertex = this.getPointCoord(state)
    if (!vertex || !isOnSVG(e.target.parentNode)) {
      return
    }

    state._moveStartPosition = [...vertex]
    state._touchMoved = false

    const touch = getTouchPoint(e)
    Object.assign(state, computeTouchDragAnchors(this.map, state.touchPointTarget, touch, vertex, state.scale))
  },

  onTouchmove (state, e) {
    if (!isOnSVG(e.target.parentNode)) {
      return
    }

    state._touchMoved = true

    const touch = getTouchPoint(e)
    this.movePoint(state, resolveTouchDragCoord(this.map, state, touch))
    this.updateTouchPointTarget(state, { x: touch.x - state.deltaTarget.x, y: touch.y - state.deltaTarget.y })
  }
}
