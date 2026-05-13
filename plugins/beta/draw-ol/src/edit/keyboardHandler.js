import { coordToPixel, nudgeCoord } from '../utils/olCoords.js'
import { spatialNavigate } from '../utils/spatial.js'
import { moveVertex, insertAtMidpoint } from './vertexOps.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const NUDGE_PX = 1
const STEP_PX = 5

/**
 * Keyboard handler for edit mode.
 *
 * Space     — select nearest vertex to safe-zone center
 * Alt+Arrow — navigate vertices / midpoints spatially
 * Arrow     — nudge selected vertex (Shift = fine, plain = coarse)
 * Delete    — delete selected vertex
 * Ctrl/Cmd+Z — undo
 *
 * @param {{ map, container, getState, setState, onVertexMoved, onInserted, onDeleted, onUndo }}
 * @returns {{ destroy }}
 */
export const createKeyboardHandler = ({
  map, container, getState, setState,
  onVertexMoved, onInserted, onDeleted, onUndo
}) => {
  // Accumulate keyboard nudge moves for a single undo entry
  let keyMoveStart = null
  let keyMoveIndex = null

  const selectNearest = () => {
    const { vertecies, midpoints } = getState()
    if (!vertecies.length) return

    const centerCoord = map.getView().getCenter()
    const centerPx = coordToPixel(map, centerCoord)
    if (!centerPx) return

    const allPixels = [
      ...vertecies.map(c => coordToPixel(map, c)),
      ...midpoints.map(c => coordToPixel(map, c))
    ].filter(Boolean).map(p => [p.x, p.y])

    const idx = spatialNavigate([centerPx.x, centerPx.y], allPixels, undefined)
    const type = idx < vertecies.length ? 'vertex' : 'midpoint'
    setState({ selectedVertexIndex: idx, selectedVertexType: type })
  }

  const navigateTo = (direction) => {
    const { selectedVertexIndex, vertecies, midpoints } = getState()
    if (!vertecies.length) return

    const allCoords = [...vertecies, ...midpoints]
    const allPixels = allCoords
      .map(c => coordToPixel(map, c))
      .filter(Boolean)
      .map(p => [p.x, p.y])

    const startPx = selectedVertexIndex >= 0
      ? allPixels[selectedVertexIndex]
      : (() => { const c = coordToPixel(map, map.getView().getCenter()); return c ? [c.x, c.y] : null })()

    if (!startPx) return

    const idx = spatialNavigate(startPx, allPixels, direction)
    const type = idx < vertecies.length ? 'vertex' : 'midpoint'
    setState({ selectedVertexIndex: idx, selectedVertexType: type })
  }

  const nudge = (e) => {
    const { selectedVertexIndex, selectedVertexType, vertecies, midpoints, olFeature } = getState()
    if (!olFeature) return

    if (selectedVertexType === 'midpoint') {
      // Nudge on midpoint = insert vertex at midpoint, then move it
      const localIdx = selectedVertexIndex - vertecies.length
      const result = insertAtMidpoint(olFeature, midpoints, selectedVertexIndex, vertecies.length)
      if (!result) return
      onInserted({ insertedIndex: result.insertedIndex })
      setState({ selectedVertexIndex: result.insertedIndex, selectedVertexType: 'vertex' })
      return
    }

    if (selectedVertexIndex < 0 || !vertecies[selectedVertexIndex]) return

    const step = e.shiftKey ? NUDGE_PX : STEP_PX
    const offsets = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }
    const [dx, dy] = offsets[e.key]

    const current = vertecies[selectedVertexIndex]

    if (!keyMoveStart) {
      keyMoveStart = [...current]
      keyMoveIndex = selectedVertexIndex
    }

    const newCoord = nudgeCoord(map, current, dx, dy)
    moveVertex(olFeature, selectedVertexIndex, newCoord)
    setState({ vertecies: vertecies.map((c, i) => i === selectedVertexIndex ? newCoord : c) })
  }

  const onKeydown = (e) => {
    if (document.activeElement !== container) return

    if (e.key === ' ' && getState().selectedVertexIndex < 0) {
      e.preventDefault()
      selectNearest()
      return
    }

    if (e.altKey && ARROW_KEYS.has(e.key) && getState().selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      navigateTo(e.key)
      return
    }

    if (!e.altKey && ARROW_KEYS.has(e.key) && getState().selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      nudge(e)
      return
    }

    if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      e.stopPropagation()
      onUndo()
    }
  }

  const onKeyup = (e) => {
    if (document.activeElement !== container) return

    // Commit accumulated keyboard nudge as single undo entry
    if (ARROW_KEYS.has(e.key) && keyMoveStart && keyMoveIndex != null) {
      onVertexMoved({ vertexIndex: keyMoveIndex, previousCoord: keyMoveStart })
      keyMoveStart = null
      keyMoveIndex = null
    }

    if (e.key === 'Delete') {
      onDeleted()
    }
  }

  window.addEventListener('keydown', onKeydown, { capture: true })
  window.addEventListener('keyup', onKeyup, { capture: true })

  return {
    destroy () {
      window.removeEventListener('keydown', onKeydown, { capture: true })
      window.removeEventListener('keyup', onKeyup, { capture: true })
    }
  }
}
