import {
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from './geometryHelpers.js'
import { scalePoint } from './helpers.js'

// Map an undo-stack op type onto the geometry-change `phase` consumed by validation.
const UNDO_OP_PHASE = {
  move_vertex: 'commit-move',
  insert_vertex: 'commit-insert',
  delete_vertex: 'commit-delete'
}

// Undoing an op commits the inverse change (undo of a delete re-inserts, etc.),
// so its re-validation reports the inverse phase.
const UNDO_INVERSE_PHASE = {
  move_vertex: 'commit-move',
  insert_vertex: 'commit-delete',
  delete_vertex: 'commit-insert'
}

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
    // Every edit commit (move/insert/delete, via mouse or keyboard) records an undo
    // op here, so this is the single point that feeds commit-level validation.
    this.emitGeometryValidation(UNDO_OP_PHASE[operation.type], operation.vertexIndex, operation.featureId)
  },

  handleUndo (state) {
    const undoStack = this.map._undoStack
    if (!undoStack || undoStack.length === 0) {
      return
    }

    const op = undoStack.pop()

    if (op.type === 'move_vertex') {
      this.undoMoveVertex(state, op)
    } else if (op.type === 'insert_vertex') {
      this.undoInsertVertex(state, op)
    } else if (op.type === 'delete_vertex') {
      this.undoDeleteVertex(state, op)
    } else {
      // No action
    }
    // An undo commits the inverse change, so it must re-validate like any other
    // commit — otherwise the invalid stroke and the Done gate go stale.
    this.emitGeometryValidation(UNDO_INVERSE_PHASE[op.type], op.vertexIndex, op.featureId)
  },

  undoMoveVertex (state, op) {
    const { vertexIndex, previousPosition, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) { return }

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, vertexIndex)
    if (!result) { return }

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords[result.localIdx] = previousPosition
    this._applyUndoAndSync(state, geojson, featureId)

    // Update touch vertex target position
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  undoInsertVertex (state, op) {
    const { vertexIndex, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) { return }

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, vertexIndex)
    if (!result) { return }

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords.splice(result.localIdx, 1)
    this._applyUndoAndSync(state, geojson, featureId)

    // Clear DirectSelect's coordinate selection
    this.clearSelectedCoordinates()
    this.hideTouchVertexIndicator(state)
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null })
  },

  undoDeleteVertex (state, op) {
    const { vertexIndex, position, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) {
      return
    }

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)

    // Try to find segment containing vertexIndex
    let result = getSegmentForIndex(segments, vertexIndex)

    // If not found, vertex might be at segment boundary
    if (!result) {
      for (const seg of segments) {
        if (vertexIndex === seg.start + seg.length) {
          result = { segment: seg, localIdx: seg.length }
          break
        }
      }
    }

    if (!result) {
      return
    }

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords.splice(result.localIdx, 0, position)
    this._applyUndoAndSync(state, geojson, featureId)

    // Re-insertion always lands the vertex back at vertexIndex, so it is guaranteed present
    this.updateTouchVertexTarget(state, scalePoint(this.map.project(state.vertecies[vertexIndex]), state.scale))
    this.changeMode(state, { selectedVertexIndex: vertexIndex, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, vertexIndex) })
  },

  _applyUndoAndSync (state, geojson, featureId) {
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(featureId)
    state.midpoints = this.getMidpoints(featureId)
    this._ctx.store.render()
    this.fireGeometryChange(state)
  }
}
