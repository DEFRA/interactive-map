import { coordToPixel, nudgeCoord } from '../utils/olCoords.js'
import { spatialNavigate } from '../../../utils/spatial.js'
import { moveVertex, insertAtMidpoint } from './vertexOps.js'
import { KEYBOARD } from '../../../defaults.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'])

const selectNearest = (map, getState, setState) => {
  const { vertices, midpoints } = getState()
  if (!vertices.length) {
    return
  }
  const centerCoord = map.getView().getCenter()
  const centerPx = coordToPixel(map, centerCoord)
  if (!centerPx) {
    return
  }
  const allPixels = [
    ...vertices.map(c => coordToPixel(map, c)),
    ...midpoints.map(c => coordToPixel(map, c))
  ].filter(Boolean).map(p => [p.x, p.y])
  const idx = spatialNavigate([centerPx.x, centerPx.y], allPixels, undefined)
  setState({ selectedVertexIndex: idx, selectedVertexType: idx < vertices.length ? 'vertex' : 'midpoint' })
}

const navigateTo = (direction, map, getState, setState) => {
  const { selectedVertexIndex, vertices, midpoints } = getState()
  if (!vertices.length) {
    return
  }
  const allCoords = [...vertices, ...midpoints]
  const allPixels = allCoords.map(c => coordToPixel(map, c)).filter(Boolean).map(p => [p.x, p.y])
  const startPx = selectedVertexIndex >= 0
    ? allPixels[selectedVertexIndex]
    : (() => {
        const c = coordToPixel(map, map.getView().getCenter())
        return c ? [c.x, c.y] : null
      })()
  if (!startPx) {
    return
  }
  const idx = spatialNavigate(startPx, allPixels, direction)
  setState({ selectedVertexIndex: idx, selectedVertexType: idx < vertices.length ? 'vertex' : 'midpoint' })
}

// Returns snappedCoord, but escapes snap if it prevents sufficient progress in the nudge direction.
// Covers vertex-stuck (snap holds position) and edge-hugging (vertex slides along edge).
const resolveSnappedCoord = (snap, map, current, nudgedCoord, snappedCoord, dx, dy) => {
  if (!snap) {
    return snappedCoord
  }
  const nudgeVec = [nudgedCoord[0] - current[0], nudgedCoord[1] - current[1]]
  const actualVec = [snappedCoord[0] - current[0], snappedCoord[1] - current[1]]
  const nudgeLenSq = nudgeVec[0] ** 2 + nudgeVec[1] ** 2
  const dot = actualVec[0] * nudgeVec[0] + actualVec[1] * nudgeVec[1]
  if (nudgeLenSq > 0 && dot / nudgeLenSq < 0.5) {
    const escapePx = snap.snapRadius + 1
    return nudgeCoord(map, current, dx === 0 ? 0 : Math.sign(dx) * escapePx, dy === 0 ? 0 : Math.sign(dy) * escapePx)
  }
  return snappedCoord
}

const wireNudge = ({ map, snap, getState, setState, onInserted }) => {
  const keyMove = { start: null, index: null }

  // Insert the midpoint as a vertex then move it — midpoints stay as midpoints until actually moved.
  const nudgeMidpoint = (olFeature, midpoints, selectedVertexIndex, vertices, dx, dy) => {
    const result = insertAtMidpoint(olFeature, midpoints, selectedVertexIndex, vertices.length)
    if (!result) {
      return
    }
    onInserted({ insertedIndex: result.insertedIndex }) // pushes insert_vertex undo + syncGeom
    const updatedVertices = getState().vertices
    const insertedCoord = updatedVertices[result.insertedIndex]
    if (!insertedCoord) {
      return
    }
    keyMove.start = [...insertedCoord]
    keyMove.index = result.insertedIndex
    const nudgedCoord = nudgeCoord(map, insertedCoord, dx, dy)
    const movedCoord = snap ? snap.apply(nudgedCoord) : nudgedCoord
    moveVertex(olFeature, result.insertedIndex, movedCoord)
    setState({
      selectedVertexIndex: result.insertedIndex,
      selectedVertexType: 'vertex',
      vertices: updatedVertices.map((c, i) => i === result.insertedIndex ? movedCoord : c)
    })
  }

  const nudge = (e) => {
    const { selectedVertexIndex, selectedVertexType, vertices, midpoints, olFeature } = getState()
    if (!olFeature) {
      return
    }
    const step = e.shiftKey ? KEYBOARD.nudgeAmount : KEYBOARD.stepAmount
    const offsets = { ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0] }
    const [dx, dy] = offsets[e.key]
    if (selectedVertexType === 'midpoint') {
      nudgeMidpoint(olFeature, midpoints, selectedVertexIndex, vertices, dx, dy)
      return
    }
    if (selectedVertexIndex < 0 || !vertices[selectedVertexIndex]) {
      return
    }
    const current = vertices[selectedVertexIndex]
    if (!keyMove.start) {
      keyMove.start = [...current]
      keyMove.index = selectedVertexIndex
    }
    const nudgedCoord = nudgeCoord(map, current, dx, dy)
    const snappedCoord = snap ? snap.apply(nudgedCoord) : nudgedCoord
    snap?.hideIndicator()
    const newCoord = resolveSnappedCoord(snap, map, current, nudgedCoord, snappedCoord, dx, dy)
    moveVertex(olFeature, selectedVertexIndex, newCoord)
    setState({ vertices: vertices.map((c, i) => i === selectedVertexIndex ? newCoord : c) })
  }

  return { nudge, keyMove }
}

const isInteractiveElementFocused = (appViewport) => {
  const el = document.activeElement
  if (!el || el === document.body) {
    return false
  }
  if (appViewport.contains(el)) {
    return false
  }
  const tag = el.tagName
  return INTERACTIVE_TAGS.has(tag) || el.isContentEditable || el.hasAttribute('tabindex')
}

const wireKeyboardEvents = ({ map, snap, getState, setState, onVertexMoved, onInserted, onDeleted, onUndo, onKeyboardActive }) => {
  const { nudge, keyMove } = wireNudge({ map, snap, getState, setState, onInserted })
  const appViewport = map.getViewport().closest('[role="application"]') ?? map.getViewport()
  const isFocused = () => isInteractiveElementFocused(appViewport)

  const handleArrowKey = (e) => {
    if (e.altKey) {
      e.preventDefault()
      e.stopPropagation()
      navigateTo(e.key, map, getState, setState)
    } else if (getState().selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      nudge(e)
    } else {
      // No action: arrow with no selection and no alt modifier
    }
  }

  const handleKey = (e) => {
    onKeyboardActive?.()
    if (e.key === ' ') {
      e.preventDefault()
      if (getState().selectedVertexIndex < 0) {
        selectNearest(map, getState, setState)
      }
    } else if (ARROW_KEYS.has(e.key)) {
      handleArrowKey(e)
    } else if (e.key === 'z' && (e.metaKey || e.ctrlKey)) {
      const tag = document.activeElement?.tagName
      if (!INTERACTIVE_TAGS.has(tag)) {
        e.preventDefault()
        e.stopPropagation()
        onUndo()
      }
    } else {
      // No action
    }
  }

  const onKeydown = (e) => {
    if (!isFocused()) {
      if (e.key === 'Escape' && getState().selectedVertexIndex >= 0) {
        e.preventDefault()
        keyMove.start = null
        keyMove.index = null
        setState({ selectedVertexIndex: -1, selectedVertexType: null })
      } else {
        handleKey(e)
      }
    }
  }

  const onKeyup = (e) => {
    if (!isFocused()) {
      if (ARROW_KEYS.has(e.key) && keyMove.start && keyMove.index != null) {
        snap?.hideIndicator()
        onVertexMoved({ vertexIndex: keyMove.index, previousCoord: keyMove.start })
        keyMove.start = null
        keyMove.index = null
      }
      if (e.key === 'Delete') {
        onDeleted()
      }
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
export const createKeyboardHandler = (options) => wireKeyboardEvents(options)
