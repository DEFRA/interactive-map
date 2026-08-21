import { KEYBOARD } from '../defaults.js'
import {
  getSnapInstance, isSnapActive, isSnapEnabled, getSnapLngLat,
  getSnapRadius, triggerSnapAtPoint, clearSnapIndicator
} from './snapHelpers.js'
import { ARROW_OFFSETS } from './keyboardShortcuts.js'

// Shared by editPointMode/pointOperations.js and editVertexMode/vertexOperations.js — a
// keyboard/D-pad nudge resolves to the same pixel-offset-then-project-back coordinate math
// and the same snap/break-out-of-snap rule for both a single-coordinate Point and a ring
// vertex; only what happens to that resolved coordinate afterwards (moveVertex's ring
// splice vs movePoint's direct updateCoordinate) differs, so that part stays local to
// each mode's own operations file.
export const sharedSnapMovement = {
  getOffset (coord, e) {
    const pt = this.map.project(coord)
    const offset = e?.shiftKey ? KEYBOARD.nudgeAmount : KEYBOARD.stepAmount
    const [dx, dy] = e ? ARROW_OFFSETS[e.key].map(v => v * offset) : [0, 0]
    return this.map.unproject({ x: pt.x + dx, y: pt.y + dy })
  },

  // Explicit-delta counterpart to getOffset, driven by a unit direction vector and
  // MoveControls' own Precision toggle rather than a KeyboardEvent — used by
  // nudgeVertexByDelta/nudgePointByDelta.
  getOffsetByDelta (coord, dx, dy, isLargeStep) {
    const pt = this.map.project(coord)
    const amount = isLargeStep ? KEYBOARD.stepAmount : KEYBOARD.nudgeAmount
    return this.map.unproject({ x: pt.x + dx * amount, y: pt.y + dy * amount })
  },

  // Resolves the destination coordinate for a nudge by (dx, dy) unit direction, applying
  // snap or breaking out of an already-active one — shared by the keyboard arrow-key path
  // and MoveControls' explicit-delta path so both snap identically. dx/dy are only needed
  // for the snap-escape offset; getCandidate computes the raw, un-snapped destination the
  // caller would otherwise have used.
  resolveSnapTarget (state, dx, dy, currentCoord, getCandidate) {
    const snap = getSnapInstance(this.map)

    // Break out of an active snap by moving beyond the snap radius
    if (isSnapEnabled(state) && state._isSnapped && snap) {
      const offset = getSnapRadius(snap) + 1
      const pt = this.map.project(currentCoord)
      state._isSnapped = false
      clearSnapIndicator(snap, this.map)
      return this.map.unproject({ x: pt.x + dx * offset, y: pt.y + dy * offset })
    }

    const newCoord = getCandidate()
    if (isSnapEnabled(state) && snap) {
      triggerSnapAtPoint(snap, this.map, this.map.project(newCoord))
      if (isSnapActive(snap)) {
        state._isSnapped = true
        return getSnapLngLat(snap)
      }
    }
    state._isSnapped = false
    return newCoord
  }
}
