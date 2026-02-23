import {
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from './geometryHelpers.js'
import { scalePoint } from './helpers.js'

export const undoHandlers = {
  // Fire geometry change event (for external listeners)
  fireGeometryChange(state) {
    const feature = this.getFeature(state.featureId)
    if (feature) {
      this.map.fire('draw.update', {
        features: [feature.toGeoJSON()],
        action: 'change_coordinates'
      })
    }
  },

  // Undo support
  pushUndo(operation) {
    const undoStack = this.map._undoStack
    if (!undoStack) {
      return
    }
    undoStack.push(operation)
  },

  handleUndo(state) {
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
    }
  },

  undoMoveVertex(state, op) {
    const { vertexIndex, previousPosition, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) return

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, vertexIndex)
    if (!result) return

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords[result.localIdx] = previousPosition
    this._applyUndoAndSync(state, geojson, featureId)

    // Update touch vertex target position
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  undoInsertVertex(state, op) {
    const { vertexIndex, featureId } = op
    const feature = this.getFeature(featureId)
    if (!feature) return

    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, vertexIndex)
    if (!result) return

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords.splice(result.localIdx, 1)
    this._applyUndoAndSync(state, geojson, featureId)

    // Clear DirectSelect's coordinate selection
    this.clearSelectedCoordinates()
    this.hideTouchVertexIndicator(state)
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null })
  },

  undoDeleteVertex(state, op) {
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

    // Update touch vertex target to restored vertex position
    const vertex = state.vertecies[vertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
    this.changeMode(state, { selectedVertexIndex: vertexIndex, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, vertexIndex) })
  },

  _applyUndoAndSync(state, geojson, featureId) {
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(featureId)
    state.midpoints = this.getMidpoints(featureId)
    this._ctx.store.render()
    this.fireGeometryChange(state)
  }
}
