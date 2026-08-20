import { scalePoint } from '../editVertexMode/helpers.js'
import { sharedUndoHandlers } from '../../utils/geometryValidation.js'

// Map an undo-stack op type onto the geometry-change `phase` consumed by validation. Read off
// `this` by the shared pushUndo mixin (utils/geometryValidation.js) — see that file's comment.
const UNDO_OP_PHASE = { move_point: 'commit-move' }

// Undoing a move commits the inverse move, so it re-validates with the same phase.
const UNDO_INVERSE_PHASE = { move_point: 'commit-move' }

// Same dispatch-by-op-type pattern as editVertexMode/undoHandlers.js, but with a single op
// type — there's no insert/delete concept for a Point's one coordinate — so undoMovePoint
// writes the coordinate directly, with no getRingSegments/getSegmentForIndex/
// getModifiableCoords lookup needed at all.
export const undoHandlers = {
  ...sharedUndoHandlers,
  UNDO_OP_PHASE,
  UNDO_INVERSE_PHASE,

  handleUndo (state) {
    const undoStack = this.map._undoStack
    if (!undoStack || undoStack.length === 0) {
      return
    }

    const op = undoStack.pop()

    if (op.type === 'move_point') {
      this.undoMovePoint(state, op)
    }
    // An undo commits the inverse change, so it must re-validate like any other
    // commit — otherwise the invalid stroke and the Done gate go stale.
    this.emitGeometryValidation(UNDO_INVERSE_PHASE[op.type], op.vertexIndex, op.featureId)
  },

  undoMovePoint (state, op) {
    const { previousPosition, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) { return }

    feature.updateCoordinate('', previousPosition[0], previousPosition[1])
    this._ctx.store.render()
    this.fireGeometryChange(state)
    this.updateTouchPointTarget(state, scalePoint(this.map.project(previousPosition), state.scale))
  }
}
