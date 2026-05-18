import { coordToPixel, nudgeCoord } from '../utils/olCoords.js'
import { spatialNavigate } from '../utils/spatial.js'
import { moveVertex, insertAtMidpoint } from './vertexOps.js'
import { SNAP_RADIUS_PX } from '../snap/snapEngine.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const NUDGE_PX = 1
const STEP_PX = 5

/**
 * Keyboard handler for edit mode.
 *
 * Space       — select nearest vertex or midpoint to crosshair (only when nothing selected)
 * Alt+Arrow   — navigate to next vertex/midpoint in that direction (requires selection)
 * Arrow       — move selected vertex; if midpoint selected, inserts it as a vertex and moves it
 * Shift+Arrow — same but fine nudge (1px vs 5px)
 * Delete      — delete selected vertex (no-op on midpoints)
 * Ctrl/Cmd+Z  — undo
 *
 * Midpoints remain midpoints until moved — navigating to a midpoint (Space/Alt+Arrow) does not
 * convert it. Only pressing a plain/Shift arrow converts it.
 *
 * @param {{ map, container, getState, setState, onVertexMoved, onInserted, onDeleted, onUndo }}
 * @returns {{ destroy }}
 */
export const createKeyboardHandler = ({
  map, getState, setState,
  onVertexMoved, onInserted, onDeleted, onUndo,
  onKeyboardActive, snap
}) => {
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

    const step = e.shiftKey ? NUDGE_PX : STEP_PX
    const offsets = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }
    const [dx, dy] = offsets[e.key]

    if (selectedVertexType === 'midpoint') {
      // Insert the midpoint as a vertex, then immediately move it in the pressed direction.
      // This matches the ML behaviour: midpoints stay as midpoints until actually moved.
      const result = insertAtMidpoint(olFeature, midpoints, selectedVertexIndex, vertecies.length)
      if (!result) return
      onInserted({ insertedIndex: result.insertedIndex }) // pushes insert_vertex undo + syncGeom

      // After syncGeom in onInserted, state.vertecies is updated with the new vertex
      const updatedVertecies = getState().vertecies
      const insertedCoord = updatedVertecies[result.insertedIndex]
      if (!insertedCoord) return

      // keyMoveStart at the midpoint position so keyup undo restores there
      keyMoveStart = [...insertedCoord]
      keyMoveIndex = result.insertedIndex

      const nudgedCoord = nudgeCoord(map, insertedCoord, dx, dy)
      const movedCoord = snap ? snap.apply(nudgedCoord) : nudgedCoord
      moveVertex(olFeature, result.insertedIndex, movedCoord)
      setState({
        selectedVertexIndex: result.insertedIndex,
        selectedVertexType: 'vertex',
        vertecies: updatedVertecies.map((c, i) => i === result.insertedIndex ? movedCoord : c)
      })
      return
    }

    if (selectedVertexIndex < 0 || !vertecies[selectedVertexIndex]) return

    const current = vertecies[selectedVertexIndex]
    if (!keyMoveStart) {
      keyMoveStart = [...current]
      keyMoveIndex = selectedVertexIndex
    }

    const nudgedCoord = nudgeCoord(map, current, dx, dy)
    let newCoord = snap ? snap.apply(nudgedCoord) : nudgedCoord
    snap?.hideIndicator()

    // Escape if snap is preventing sufficient progress in the intended direction.
    // Covers vertex-stuck (newCoord === current) and edge-hugging (vertex slides
    // along edge instead of moving away from it).
    if (snap) {
      const nudgeVec = [nudgedCoord[0] - current[0], nudgedCoord[1] - current[1]]
      const actualVec = [newCoord[0] - current[0], newCoord[1] - current[1]]
      const nudgeLenSq = nudgeVec[0] ** 2 + nudgeVec[1] ** 2
      const dot = actualVec[0] * nudgeVec[0] + actualVec[1] * nudgeVec[1]
      if (nudgeLenSq > 0 && dot / nudgeLenSq < 0.5) {
        const escape = SNAP_RADIUS_PX + 1
        newCoord = nudgeCoord(map, current, dx !== 0 ? Math.sign(dx) * escape : 0, dy !== 0 ? Math.sign(dy) * escape : 0)
      }
    }

    moveVertex(olFeature, selectedVertexIndex, newCoord)
    setState({ vertecies: vertecies.map((c, i) => i === selectedVertexIndex ? newCoord : c) })
  }

  const isTextInput = () => {
    const el = document.activeElement
    return el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable
  }

  const onKeydown = (e) => {
    if (isTextInput()) { return }

    if (e.key === 'Escape' && getState().selectedVertexIndex >= 0) {
      e.preventDefault()
      keyMoveStart = null
      keyMoveIndex = null
      setState({ selectedVertexIndex: -1, selectedVertexType: null })
      return
    }

    onKeyboardActive?.()

    if (e.key === ' ' && getState().selectedVertexIndex < 0) {
      e.preventDefault()
      selectNearest()
      return
    }

    if (e.altKey && ARROW_KEYS.has(e.key)) {
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
    if (isTextInput()) { return }

    if (ARROW_KEYS.has(e.key) && keyMoveStart && keyMoveIndex != null) {
      snap?.hideIndicator()
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
