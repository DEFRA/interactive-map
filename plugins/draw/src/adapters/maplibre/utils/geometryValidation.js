import { CHANGE_PHASE } from '../../../adapterEvents.js'

// Shared by editPointMode/undoHandlers.js and editVertexMode/undoHandlers.js — recording an
// undo op and feeding it to commit-level validation is identical plumbing for both modes; only
// the op types themselves differ (a Point only ever moves, a ring vertex can also be inserted
// or deleted).
export const sharedUndoHandlers = {
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

  // Emit a commit-level geometrychange (feature + 'change' phase + vertex index) so the
  // validation layer can gate the Done button. Deferred a tick so it reports the shape
  // after the current mutation (and its undo bookkeeping) has fully settled.
  emitGeometryValidation (vertexIndex, featureId) {
    setTimeout(() => {
      const feature = this.getFeature(featureId)
      if (!feature) { return }
      this.map.fire('draw.geometrychange', { feature: feature.toGeoJSON(), phase: CHANGE_PHASE, vertexIndex })
    }, 0)
  },

  // Undo support
  pushUndo (operation) {
    const undoStack = this.map._undoStack
    if (!undoStack) {
      return
    }
    undoStack.push(operation)
    // Every edit commit (move/insert/delete, via mouse/touch/keyboard/D-pad) records an undo
    // op here, so this is the single point that feeds commit-level validation.
    this.emitGeometryValidation(operation.vertexIndex, operation.featureId)
  }
}
