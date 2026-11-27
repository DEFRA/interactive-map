import { scalePoint } from '../editVertexMode/helpers.js'
import { sharedUndoHandlers } from '../../utils/geometryValidation.js'

// Same dispatch-by-op-type pattern as editVertexMode/undoHandlers.js, but with a single op
// type — there's no insert/delete concept for a Point's one coordinate — so undoMovePoint
// writes the coordinate directly, with no getRingSegments/getSegmentForIndex/
// getModifiableCoords lookup needed at all.
export const undoHandlers = {
  ...sharedUndoHandlers,

  handleUndo (state) {
    const undoStack = this.map._undoStack
    if (!undoStack || undoStack.length === 0) {
      return
    }

    const op = undoStack.pop()

    if (op.type === 'move_point' || op.type === 'replace_geometry') {
      this.undoMovePoint(state, op)
    }
    // An undo commits the inverse change, so it must re-validate like any other
    // commit — otherwise the invalid stroke and the Done gate go stale.
    this.emitGeometryValidation(op.vertexIndex, op.featureId)
  },

  undoMovePoint (state, op) {
    this.setPointPosition(state, op.featureId, op.previousPosition)
  },

  setPointPosition (state, featureId, position) {
    const feature = this.getFeature(featureId)
    if (!feature) { return }

    feature.updateCoordinate('', position[0], position[1])
    this._ctx.store.render()
    this.fireGeometryChange(state)
    this.updateTouchPointTarget(state, scalePoint(this.map.project(position), state.scale))
  }
}
