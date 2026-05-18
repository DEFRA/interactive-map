import { coordToPixel, pixelToCoord } from '../utils/olCoords.js'
import { createTouchTarget, applyTouchTargetColors, showTouchTarget, hideTouchTarget, isOnTouchTarget } from '../utils/touchTarget.js'
import { moveVertex } from './vertexOps.js'
import { findNearest } from './vertexHitTest.js'

const TAP_MOVE_THRESHOLD = 10
const TAP_TIME_THRESHOLD = 400
const TOUCH_TOLERANCE = 24

const wireTouchEvents = ({ container, map, targetEl, olToCSS, cssToOl, getState, setState, onVertexMoved, onTap }) => {
  let dragStartCoord = null
  let dragStartIndex = null
  let vertexTouchDelta = null
  let targetTouchDelta = null
  let tapStart = null

  const onTouchstart = (e) => {
    const touch = e.touches[0]
    const onTarget = isOnTouchTarget(e.target)
    tapStart = { x: touch.clientX, y: touch.clientY, time: Date.now(), onTarget }
    if (!onTarget) { return }
    const { selectedVertexIndex, vertecies } = getState()
    const vertex = vertecies[selectedVertexIndex]
    if (!vertex) { return }
    const tOl = map.getEventPixel({ clientX: touch.clientX, clientY: touch.clientY })
    const vertexPx = coordToPixel(map, vertex)
    const style = getComputedStyle(targetEl)
    const svgOlPx = cssToOl({ x: Number.parseFloat(style.left), y: Number.parseFloat(style.top) })
    dragStartCoord = [...vertex]
    dragStartIndex = selectedVertexIndex
    vertexTouchDelta = { x: tOl[0] - vertexPx.x, y: tOl[1] - vertexPx.y }
    targetTouchDelta = { x: tOl[0] - svgOlPx.x, y: tOl[1] - svgOlPx.y }
    e.preventDefault()
  }

  const onTouchmove = (e) => {
    if (!isOnTouchTarget(e.target) || dragStartIndex == null) { return }
    e.preventDefault()
    const tOl = map.getEventPixel({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY })
    const newCoord = pixelToCoord(map, { x: tOl[0] - vertexTouchDelta.x, y: tOl[1] - vertexTouchDelta.y })
    const { olFeature, vertecies } = getState()
    if (!olFeature) { return }
    moveVertex(olFeature, dragStartIndex, newCoord)
    setState({ vertecies: vertecies.map((c, i) => i === dragStartIndex ? newCoord : c) })
    showTouchTarget(targetEl, olToCSS({ x: tOl[0] - targetTouchDelta.x, y: tOl[1] - targetTouchDelta.y }))
  }

  const onTouchend = (e) => {
    const wasDragging = dragStartIndex != null
    if (!wasDragging) {
      if (tapStart && !tapStart.onTarget && e.changedTouches.length > 0) {
        const t = e.changedTouches[0]
        const dt = Date.now() - tapStart.time
        if (Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y) < TAP_MOVE_THRESHOLD && dt < TAP_TIME_THRESHOLD) {
          const tOl = map.getEventPixel({ clientX: t.clientX, clientY: t.clientY })
          const tapState = getState()
          onTap?.(findNearest(map, tapState.vertecies, tapState.midpoints, { x: tOl[0], y: tOl[1] }, TOUCH_TOLERANCE))
          e.preventDefault()
        }
      }
      tapStart = null
      return
    }
    tapStart = null
    const { vertecies } = getState()
    if (vertecies[dragStartIndex] && dragStartCoord) {
      onVertexMoved({ vertexIndex: dragStartIndex, previousCoord: dragStartCoord })
    }
    dragStartCoord = null; dragStartIndex = null; vertexTouchDelta = null; targetTouchDelta = null
    e.preventDefault()
  }

  container.addEventListener('touchstart', onTouchstart, { passive: false })
  container.addEventListener('touchmove', onTouchmove, { passive: false })
  container.addEventListener('touchend', onTouchend, { passive: false })

  return {
    isDragging: () => dragStartIndex != null,
    destroy () {
      container.removeEventListener('touchstart', onTouchstart)
      container.removeEventListener('touchmove', onTouchmove)
      container.removeEventListener('touchend', onTouchend)
    }
  }
}

/**
 * Touch vertex drag handler for edit mode.
 * Shows an SVG offset target below the finger so the vertex can be repositioned
 * without finger occlusion. Tap on a vertex or midpoint selects it via onTap.
 *
 * @param {{ map, container, getState, setState, onVertexMoved, onTap, colors }} options
 * @returns {{ updateTargetPosition, updateColors, hide, destroy }}
 */
export const createTouchHandler = ({ map, container, getState, setState, onVertexMoved, onTap, colors }) => {
  const targetEl = createTouchTarget(container)
  applyTouchTargetColors(targetEl, colors)

  // OL pixel space is relative to ol-viewport at its pre-scale CSS size.
  // Container CSS space is larger when a CSS transform scales up ol-viewport
  // (e.g. scale(1.5) at medium map size makes OL pixels 1.5× smaller than CSS pixels).
  const cssTx = { scale: 1, ox: 0, oy: 0 }
  const olToCSS = (p) => ({ x: p.x * cssTx.scale + cssTx.ox, y: p.y * cssTx.scale + cssTx.oy })
  const cssToOl = (p) => ({ x: (p.x - cssTx.ox) / cssTx.scale, y: (p.y - cssTx.oy) / cssTx.scale })

  const syncCssTx = () => {
    const vpEl = map.getViewport()
    const vpRect = vpEl.getBoundingClientRect()
    const cRect = container.getBoundingClientRect()
    const vpScale = vpEl.offsetWidth > 0 ? vpRect.width / vpEl.offsetWidth : 1
    const cScale = container.offsetWidth > 0 ? cRect.width / container.offsetWidth : 1
    Object.assign(cssTx, {
      scale: vpScale / cScale,
      ox: (vpRect.left - cRect.left) / cScale,
      oy: (vpRect.top - cRect.top) / cScale
    })
  }

  const touchEvents = wireTouchEvents({ container, map, targetEl, olToCSS, cssToOl, getState, setState, onVertexMoved, onTap })

  const updateTargetPosition = () => {
    const { selectedVertexIndex, vertecies, interfaceType } = getState()
    if (selectedVertexIndex < 0 || !vertecies[selectedVertexIndex] || interfaceType !== 'touch') {
      hideTouchTarget(targetEl)
      return
    }
    showTouchTarget(targetEl, olToCSS(coordToPixel(map, vertecies[selectedVertexIndex])))
  }

  // Reposition on every render — keeps target anchored during pinch-zoom and pan.
  // Skipped during drag since touchmove handles position directly.
  const onPostrender = () => {
    const { selectedVertexIndex, interfaceType } = getState()
    if (selectedVertexIndex >= 0 && !touchEvents.isDragging() && interfaceType === 'touch') {
      updateTargetPosition()
    }
  }
  map.on('postrender', onPostrender)

  const onSizeChange = () => { syncCssTx(); map.once('postrender', updateTargetPosition) }
  map.on('change:size', onSizeChange)
  syncCssTx()

  return {
    updateTargetPosition,
    updateColors (newColors) { applyTouchTargetColors(targetEl, newColors) },
    hide () { hideTouchTarget(targetEl) },
    destroy () {
      map.un('change:size', onSizeChange)
      map.un('postrender', onPostrender)
      touchEvents.destroy()
      hideTouchTarget(targetEl)
    }
  }
}
