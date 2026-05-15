import { coordToPixel, pixelToCoord } from '../utils/olCoords.js'
import { createTouchTarget, showTouchTarget, hideTouchTarget, isOnTouchTarget } from '../utils/touchTarget.js'
import { moveVertex } from './vertexOps.js'
import { findNearest } from './vertexHitTest.js'

const TAP_MOVE_THRESHOLD = 10   // px — movement beyond this is a drag, not a tap
const TAP_TIME_THRESHOLD = 400  // ms
const TOUCH_TOLERANCE = 24      // px — larger hit area for touch vs pointer

/**
 * Touch vertex drag handler for edit mode.
 *
 * Shows an SVG offset target below the finger when a vertex is selected in
 * touch mode, allowing accurate repositioning without finger occlusion.
 * Drag moves the vertex directly (bypasses OL Modify).
 * Tap on a vertex or midpoint selects it via the onTap callback.
 *
 * @param {{ map, container, olFeature, getState, setState, onVertexMoved, onTap }}
 * @returns {{ updateTargetPosition, hide, destroy }}
 */
export const createTouchHandler = ({ map, container, getState, setState, onVertexMoved, onTap }) => {
  const targetEl = createTouchTarget(container)

  // Per-drag state
  let dragStartCoord = null     // vertex coordinate at touch start
  let dragStartIndex = null     // vertex index being dragged
  let vertexTouchDelta = null   // offset from touch point to vertex pixel
  let targetTouchDelta = null   // offset from touch point to target element
  let tapStart = null           // { x, y, time, onTarget } — for tap detection

  // --- Target positioning ---

  const updateTargetPosition = () => {
    const { selectedVertexIndex, vertecies } = getState()
    if (selectedVertexIndex < 0 || !vertecies[selectedVertexIndex]) {
      hideTouchTarget(targetEl)
      return
    }
    const pixel = coordToPixel(map, vertecies[selectedVertexIndex])
    showTouchTarget(targetEl, pixel)
  }

  // --- Touch event handlers ---

  const onTouchstart = (e) => {
    const touch = e.touches[0]
    const onTarget = isOnTouchTarget(e.target)
    tapStart = { x: touch.clientX, y: touch.clientY, time: Date.now(), onTarget }

    if (!onTarget) return

    const { selectedVertexIndex, vertecies } = getState()
    const vertex = vertecies[selectedVertexIndex]
    if (!vertex) return

    const tOl = map.getEventPixel({ clientX: touch.clientX, clientY: touch.clientY })
    const vertexPx = coordToPixel(map, vertex)
    const style = getComputedStyle(targetEl)

    dragStartCoord = [...vertex]
    dragStartIndex = selectedVertexIndex
    vertexTouchDelta = { x: tOl[0] - vertexPx.x, y: tOl[1] - vertexPx.y }
    targetTouchDelta = { x: tOl[0] - Number.parseFloat(style.left), y: tOl[1] - Number.parseFloat(style.top) }

    e.preventDefault()
  }

  const onTouchmove = (e) => {
    if (!isOnTouchTarget(e.target) || dragStartIndex == null) return
    e.preventDefault()

    const tOl = map.getEventPixel({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })
    const newVertexPx = { x: tOl[0] - vertexTouchDelta.x, y: tOl[1] - vertexTouchDelta.y }
    const newCoord = pixelToCoord(map, newVertexPx)
    const { olFeature, vertecies } = getState()
    if (!olFeature) return

    moveVertex(olFeature, dragStartIndex, newCoord)
    setState({ vertecies: vertecies.map((c, i) => i === dragStartIndex ? newCoord : c) })
    showTouchTarget(targetEl, { x: tOl[0] - targetTouchDelta.x, y: tOl[1] - targetTouchDelta.y })
  }

  const onTouchend = (e) => {
    const wasDragging = dragStartIndex != null

    if (!wasDragging) {
      if (tapStart && !tapStart.onTarget && e.changedTouches.length > 0) {
        const t = e.changedTouches[0]
        const dx = t.clientX - tapStart.x
        const dy = t.clientY - tapStart.y
        const dt = Date.now() - tapStart.time

        if (Math.sqrt(dx * dx + dy * dy) < TAP_MOVE_THRESHOLD && dt < TAP_TIME_THRESHOLD) {
          const tOl = map.getEventPixel({ clientX: t.clientX, clientY: t.clientY })
          const pixel = { x: tOl[0], y: tOl[1] }
          const { vertecies, midpoints } = getState()
          const hit = findNearest(map, vertecies, midpoints, pixel, TOUCH_TOLERANCE)
          onTap?.(hit)
          e.preventDefault()
        }
      }
      tapStart = null
      return
    }

    tapStart = null

    const { vertecies } = getState()
    const finalCoord = vertecies[dragStartIndex]

    if (finalCoord && dragStartCoord) {
      onVertexMoved({
        vertexIndex: dragStartIndex,
        previousCoord: dragStartCoord
      })
    }

    dragStartCoord = null
    dragStartIndex = null
    vertexTouchDelta = null
    targetTouchDelta = null
    e.preventDefault()
  }

  container.addEventListener('touchstart', onTouchstart, { passive: false })
  container.addEventListener('touchmove', onTouchmove, { passive: false })
  container.addEventListener('touchend', onTouchend, { passive: false })

  return {
    updateTargetPosition,
    hide () { hideTouchTarget(targetEl) },

    destroy () {
      container.removeEventListener('touchstart', onTouchstart)
      container.removeEventListener('touchmove', onTouchmove)
      container.removeEventListener('touchend', onTouchend)
      hideTouchTarget(targetEl)
    }
  }
}
