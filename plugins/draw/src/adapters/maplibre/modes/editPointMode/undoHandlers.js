import { scalePoint } from '../editVertexMode/helpers.js'

// Map an undo-stack op type onto the geometry-change `phase` consumed by validation.
const UNDO_OP_PHASE = { move_point: 'commit-move' }

// Undoing a move commits the inverse move, so it re-validates with the same phase.
const UNDO_INVERSE_PHASE = { move_point: 'commit-move' }

// Same dispatch-by-op-type pattern as editVertexMode/undoHandlers.js, but with a single op
// type — there's no insert/delete concept for a Point's one coordinate — so undoMovePoint
// writes the coordinate directly, with no getRingSegments/getSegmentForIndex/
// getModifiableCoords lookup needed at all.
export const undoHandlers = {
  // Fire geometry change event (for external listeners)
  fireGeometryChange (state) {
    const feature = this.getFeature(state.featureId)
    if (feature) {
      this.map.fire('draw.update', {
        features: [feature.toGeoJSON()],
        action: 'change_coordinates'
      })
    }
  },

  // Emit a commit-level geometrychange (feature + change phase + vertex index) so the
  // validation layer can accept or reject the change. Deferred a tick to avoid
  // re-entrancy: rejection calls draw.undo(), which must run after the current
  // mutation (and its undo bookkeeping) has fully settled.
  emitGeometryValidation (phase, vertexIndex, featureId) {
    if (!phase) { return }
    setTimeout(() => {
      const feature = this.getFeature(featureId)
      if (!feature) { return }
      this.map.fire('draw.geometrychange', { feature: feature.toGeoJSON(), phase, vertexIndex })
    }, 0)
  },

  // Undo support
  pushUndo (operation) {
    const undoStack = this.map._undoStack
    if (!undoStack) {
      return
    }
    undoStack.push(operation)
    // Every commit (move, via mouse/touch/keyboard/D-pad) records an undo op here, so this
    // is the single point that feeds commit-level validation.
    this.emitGeometryValidation(UNDO_OP_PHASE[operation.type], operation.vertexIndex, operation.featureId)
  },

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
