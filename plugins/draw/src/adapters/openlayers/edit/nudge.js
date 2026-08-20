import { nudgeCoord } from '../utils/olCoords.js'
import { moveVertex, insertAtMidpoint } from './vertexOps.js'
import { KEYBOARD } from '../defaults.js'

const SNAP_PROGRESS_RATIO = 0.5

/**
 * Returns snappedCoord, but escapes snap if it prevents sufficient progress in the
 * nudge direction. Covers vertex-stuck (snap holds position) and edge-hugging
 * (vertex slides along edge).
 */
export const resolveSnappedCoord = (snap, map, current, nudgedCoord, snappedCoord, dx, dy) => {
  if (!snap) {
    return snappedCoord
  }
  const nudgeVec = [nudgedCoord[0] - current[0], nudgedCoord[1] - current[1]]
  const actualVec = [snappedCoord[0] - current[0], snappedCoord[1] - current[1]]
  const nudgeLenSq = nudgeVec[0] ** 2 + nudgeVec[1] ** 2
  const dot = actualVec[0] * nudgeVec[0] + actualVec[1] * nudgeVec[1]
  if (nudgeLenSq > 0 && dot / nudgeLenSq < SNAP_PROGRESS_RATIO) {
    const escapePx = snap.snapRadius + 1
    return nudgeCoord(map, current, dx === 0 ? 0 : Math.sign(dx) * escapePx, dy === 0 ? 0 : Math.sign(dy) * escapePx)
  }
  return snappedCoord
}

/**
 * Arrow-key vertex nudging for edit mode.
 *
 * `keyMove` tracks the coordinate at the start of a nudge sequence so a single
 * move_vertex undo op can be pushed on keyup (see keyboardHandler).
 *
 * @param {(olFeature, index: number, coord: number[]) => void} [options.moveCoord] - coordinate
 *   writer, defaulting to moveVertex; point/editPointMode.js injects point/pointOps.js's
 *   movePoint instead, since a Point has no ring index to address.
 * @returns {{ nudge: (e: KeyboardEvent) => void, keyMove: { start, index }, nudgeByDelta: (dx: number, dy: number, isLargeStep: boolean) => void }}
 */
export const wireNudge = ({ map, snap, getState, setState, onInserted, onVertexMoved, moveCoord = moveVertex }) => {
  const keyMove = { start: null, index: null }

  // Shared core: moves the selected vertex by an already pixel-scaled delta,
  // applying snap. Returns the previous coordinate (for undo) and vertex index,
  // or null if there's no valid vertex selection to move.
  const moveSelectedVertexBy = (dx, dy) => {
    const { selectedVertexIndex, vertices, olFeature } = getState()
    if (!olFeature || selectedVertexIndex < 0 || !vertices[selectedVertexIndex]) {
      return null
    }
    const current = vertices[selectedVertexIndex]
    const nudgedCoord = nudgeCoord(map, current, dx, dy)
    const snappedCoord = snap ? snap.apply(nudgedCoord) : nudgedCoord
    const newCoord = resolveSnappedCoord(snap, map, current, nudgedCoord, snappedCoord, dx, dy)
    // resolveSnappedCoord can override snappedCoord with an escape jump clear of the snap
    // radius — when it does, the indicator snap.apply() just showed is now stale, so correct it.
    if (snap && newCoord !== snappedCoord) {
      snap.hideIndicator()
    }
    moveCoord(olFeature, selectedVertexIndex, newCoord)
    setState({ vertices: vertices.map((c, i) => i === selectedVertexIndex ? newCoord : c) })
    return { previousCoord: current, vertexIndex: selectedVertexIndex }
  }

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
    if (!keyMove.start) {
      keyMove.start = [...vertices[selectedVertexIndex]]
      keyMove.index = selectedVertexIndex
    }
    moveSelectedVertexBy(dx, dy)
  }

  // Explicit-delta counterpart to nudge(e) — the entry point for MoveControls'
  // D-pad (see mapProvider.activeMoveTarget in events.js). Unlike nudge(e)'s
  // held-key sequencing (undo pushed on keyup via keyMove, so repeated keydowns
  // while held batch into one undo step), each call here is one complete,
  // undoable action — a button click has no "held" state to batch. Midpoints
  // aren't handled here: MoveControls only claims the D-pad once a real vertex is
  // selected (see buildVertexMoveTarget in events.js).
  const nudgeByDelta = (dx, dy, isLargeStep) => {
    const step = isLargeStep ? KEYBOARD.stepAmount : KEYBOARD.nudgeAmount
    const result = moveSelectedVertexBy(dx * step, dy * step)
    if (result) {
      onVertexMoved({ vertexIndex: result.vertexIndex, previousCoord: result.previousCoord })
    }
  }

  return { nudge, keyMove, nudgeByDelta }
}
