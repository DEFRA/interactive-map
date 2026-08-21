// Shared by editPointMode/undoHandlers.js and editVertexMode/undoHandlers.js — recording an
// undo op and feeding it to commit-level validation is identical plumbing for both modes; only
// the op types themselves differ (a Point only ever moves, a ring vertex can also be inserted
// or deleted), which each mode still declares locally via its own UNDO_OP_PHASE/
// UNDO_INVERSE_PHASE maps (read here off `this`, since pushUndo is mixed into both modes).
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
    // Every edit commit (move/insert/delete, via mouse/touch/keyboard/D-pad) records an undo
    // op here, so this is the single point that feeds commit-level validation.
    this.emitGeometryValidation(this.UNDO_OP_PHASE[operation.type], operation.vertexIndex, operation.featureId)
  }
}
