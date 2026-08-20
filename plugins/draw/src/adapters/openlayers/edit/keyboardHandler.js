import { coordToPixel } from '../utils/olCoords.js'
import { spatialNavigate } from '../../../utils/spatial.js'
import { wireNudge } from './nudge.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const INTERACTIVE_TAGS = new Set(['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT', 'A'])

const selectNearest = (map, getState, setState) => {
  const { vertices, midpoints } = getState()
  if (!vertices.length) {
    return
  }
  const centerPx = coordToPixel(map, map.getView().getCenter())
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

const isInteractiveElementFocused = (appViewport) => {
  const el = document.activeElement
  if (!el || el === document.body) {
    return false
  }
  if (appViewport.contains(el)) {
    return false
  }
  return INTERACTIVE_TAGS.has(el.tagName) || el.isContentEditable || el.hasAttribute('tabindex')
}

const buildKeydownHandler = ({ map, getState, setState, nudge, keyMove, onUndo, onKeyboardActive, isFocused }) => {
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

  return (e) => {
    if (isFocused()) {
      return
    }
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

const buildKeyupHandler = ({ keyMove, onVertexMoved, onDeleted, isFocused }) => (e) => {
  if (isFocused()) {
    return
  }
  if (ARROW_KEYS.has(e.key) && keyMove.start && keyMove.index != null) {
    // Deliberately NOT hiding the snap indicator here — nudge.js's own snap.apply() already
    // left it showing exactly if the vertex landed on a snap target, and it should stay that
    // way after the key is released (mirrors the ML adapter, which never hides it on release
    // either — see snap/snapInteraction.js's own comment on the matching mouse-drag case).
    onVertexMoved({ vertexIndex: keyMove.index, previousCoord: keyMove.start })
    keyMove.start = null
    keyMove.index = null
  }
  if (e.key === 'Delete') {
    onDeleted()
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
 * @param {{ map, getState, setState, snap, onVertexMoved, onInserted, onDeleted, onUndo, onKeyboardActive }} options
 * @param {(olFeature, index: number, coord: number[]) => void} [options.moveCoord] - coordinate
 *   writer forwarded to wireNudge, defaulting there to moveVertex; point/editPointMode.js
 *   injects point/pointOps.js's movePoint instead.
 * @returns {{ nudgeByDelta: (dx: number, dy: number, isLargeStep: boolean) => void, destroy: () => void }}
 */
export const createKeyboardHandler = (options) => {
  const { map, snap, getState, setState, onVertexMoved, onInserted, onDeleted, onUndo, onKeyboardActive, moveCoord } = options
  const { nudge, keyMove, nudgeByDelta } = wireNudge({ map, snap, getState, setState, onInserted, onVertexMoved, moveCoord })
  const appViewport = map.getViewport().closest('[role="application"]') ?? map.getViewport()
  const isFocused = () => isInteractiveElementFocused(appViewport)

  const onKeydown = buildKeydownHandler({ map, getState, setState, nudge, keyMove, onUndo, onKeyboardActive, isFocused })
  const onKeyup = buildKeyupHandler({ keyMove, onVertexMoved, onDeleted, isFocused })

  globalThis.addEventListener('keydown', onKeydown, { capture: true })
  globalThis.addEventListener('keyup', onKeyup, { capture: true })

  return {
    nudgeByDelta,
    destroy () {
      globalThis.removeEventListener('keydown', onKeydown, { capture: true })
      globalThis.removeEventListener('keyup', onKeyup, { capture: true })
    }
  }
}
