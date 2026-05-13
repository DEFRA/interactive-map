import { coordToPixel, pixelToCoord } from '../utils/olCoords.js'
import { createTouchTarget, showTouchTarget, hideTouchTarget, isOnTouchTarget } from '../utils/touchTarget.js'
import { moveVertex } from './vertexOps.js'

/**
 * Touch vertex drag handler for edit mode.
 *
 * Shows an SVG offset target below the finger when a vertex is selected in
 * touch mode, allowing accurate repositioning without finger occlusion.
 * Drag moves the vertex directly (bypasses OL Modify).
 *
 * @param {{ map, container, olFeature, getState, setState, onVertexMoved }}
 * @returns {{ onTap, updateTargetPosition, hide, destroy }}
 */
export const createTouchHandler = ({ map, container, getState, setState, onVertexMoved }) => {
  const targetEl = createTouchTarget(container)

  // Per-drag state
  let dragStartCoord = null     // vertex coordinate at touch start
  let dragStartIndex = null     // vertex index being dragged
  let vertexTouchDelta = null   // offset from touch point to vertex pixel
  let targetTouchDelta = null   // offset from touch point to target element

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
    if (!isOnTouchTarget(e.target)) return
    const { selectedVertexIndex, vertecies } = getState()
    const vertex = vertecies[selectedVertexIndex]
    if (!vertex) return

    const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const vertexPx = coordToPixel(map, vertex)
    const style = window.getComputedStyle(targetEl)

    dragStartCoord = [...vertex]
    dragStartIndex = selectedVertexIndex
    vertexTouchDelta = { x: touch.x - vertexPx.x, y: touch.y - vertexPx.y }
    targetTouchDelta = { x: touch.x - parseFloat(style.left), y: touch.y - parseFloat(style.top) }

    e.preventDefault()
  }

  const onTouchmove = (e) => {
    if (!isOnTouchTarget(e.target) || dragStartIndex == null) return
    e.preventDefault()

    const touch = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    const newVertexPx = { x: touch.x - vertexTouchDelta.x, y: touch.y - vertexTouchDelta.y }
    const newCoord = pixelToCoord(map, newVertexPx)
    const olFeature = getState().olFeature
    if (!olFeature) return

    moveVertex(olFeature, dragStartIndex, newCoord)
    setState({ vertecies: getState().vertecies.map((c, i) => i === dragStartIndex ? newCoord : c) })
    showTouchTarget(targetEl, { x: touch.x - targetTouchDelta.x, y: touch.y - targetTouchDelta.y })
  }

  const onTouchend = (e) => {
    if (dragStartIndex == null) return

    const olFeature = getState().olFeature
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
