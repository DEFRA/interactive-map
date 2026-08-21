import {
  getCoords,
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from './geometryHelpers.js'
import { sharedSnapMovement } from '../../utils/snapMovement.js'
import { MIN_VERTICES } from '../../../../validation/rules.js'

export const vertexOperations = {
  ...sharedSnapMovement,

  updateMidpoint (coordinates) {
    setTimeout(() => {
      this.map.getSource('mapbox-gl-draw-hot').setData({
        type: 'Feature',
        properties: { meta: 'midpoint', active: 'true', id: 'active-midpoint' },
        geometry: { type: 'Point', coordinates }
      })
    }, 0)
  },

  updateVertex (state, direction) {
    const [idx, type] = this.getVertexOrMidpoint(state, direction)
    if (idx < 0 || !type) {
      return
    }
    this.changeMode(state, { selectedVertexIndex: idx, selectedVertexType: type, ...(type === 'vertex' && { coordPath: this.getCoordPath(state, idx) }) })
  },

  getNewCoord (state, e) {
    return this.getOffset(getCoords(this.getFeature(state.featureId))[state.selectedVertexIndex], e)
  },

  // Moves the selected vertex by an explicit (dx, dy) unit direction — the entry
  // point for MoveControls' D-pad (see mapProvider.activeMoveTarget in events.js),
  // as opposed to moveVertexByKey's KeyboardEvent-driven path. Each call is treated
  // as one complete, undoable action (no held-key sequencing, since a button click
  // has no "held" state to batch the way arrow keys do) — but still honours snap
  // via the shared resolveSnapTarget, same as keyboard nudging.
  nudgeVertexByDelta (state, dx, dy, isLargeStep) {
    if (state.selectedVertexType !== 'vertex' || state.selectedVertexIndex < 0) {
      return
    }
    const feature = this.getFeature(state.featureId)
    const currentCoord = feature && getCoords(feature)?.[state.selectedVertexIndex]
    if (!currentCoord) {
      return
    }
    const previousPosition = [...currentCoord]
    const vertexIndex = state.selectedVertexIndex
    const target = this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getOffsetByDelta(currentCoord, dx, dy, isLargeStep))
    this.moveVertex(state, target)
    this.pushUndo({ type: 'move_vertex', featureId: state.featureId, vertexIndex, previousPosition })
  },

  insertVertex (state, e) {
    const midIdx = state.selectedVertexIndex - state.vertecies.length
    const newCoord = this.getOffset(state.midpoints[midIdx], e)
    const feature = this.getFeature(state.featureId)
    const geojson = feature.toGeoJSON()

    // Find which segment this midpoint belongs to and calculate insertion position
    const segments = getRingSegments(feature)
    let globalInsertIdx = midIdx + 1
    let insertSegment = null
    let localInsertIdx = 0

    // Map midpoint index to segment and local position
    let midpointCounter = 0
    for (const seg of segments) {
      // Must match getMidpoints calculation
      const segMidpoints = seg.closed ? seg.length : seg.length - 1
      if (midIdx < midpointCounter + segMidpoints) {
        insertSegment = seg
        localInsertIdx = (midIdx - midpointCounter) + 1
        globalInsertIdx = seg.start + localInsertIdx
        break
      }
      midpointCounter += segMidpoints
    }

    if (!insertSegment) { return }

    const coords = getModifiableCoords(geojson, insertSegment.path)
    coords.splice(localInsertIdx, 0, [newCoord.lng, newCoord.lat])
    this._ctx.api.add(geojson)

    this.pushUndo({ type: 'insert_vertex', featureId: state.featureId, vertexIndex: globalInsertIdx })
    this.changeMode(state, { selectedVertexIndex: globalInsertIdx, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, globalInsertIdx) })
  },

  moveVertex (state, coord, options = {}) {
    if (options.checkSnap && state.enableSnap !== false) {
      const snap = this.map._snapInstance
      if (snap?.snapStatus && snap.snapCoords?.length >= 2) {
        coord = { lng: snap.snapCoords[0], lat: snap.snapCoords[1] }
      }
    }

    const feature = this.getFeature(state.featureId)
    const geojson = feature.toGeoJSON()
    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, state.selectedVertexIndex)
    if (!result) { return }

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords[result.localIdx] = [coord.lng, coord.lat]
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(state.featureId)

    this.map.fire('draw.geometrychange', state.feature)
  },

  deleteVertex (state) {
    const feature = this.getFeature(state.featureId)
    if (!feature) {
      return
    }

    const segments = getRingSegments(feature)
    const result = getSegmentForIndex(segments, state.selectedVertexIndex)
    if (!result) {
      return
    }

    const { segment } = result
    // Minimum vertices per segment (mapbox-gl-draw's internal representation is
    // a closed ring for polygons, an open path for lines) — MIN_VERTICES is the
    // single source for this threshold (validation/rules.js).
    const minVertices = segment.closed ? MIN_VERTICES.Polygon : MIN_VERTICES.LineString
    if (segment.length <= minVertices) {
      return
    }

    // Save position for undo before deletion
    const deletedPosition = [...state.vertecies[state.selectedVertexIndex]]
    const deletedIndex = state.selectedVertexIndex

    // Remove the coordinate directly rather than via this._ctx.api.trash(), which routes through
    // DirectSelect.trash() and calls onSetup({ featureId }) with incomplete options, crashing event registration.
    const coordPath = [...result.segment.path, result.localIdx].join('.')
    feature.removeCoordinate(coordPath)
    this.fireUpdate()
    this.clearSelectedCoordinates()
    feature.changed()
    this._ctx.store.render()

    // Push undo operation
    this.pushUndo({
      type: 'delete_vertex',
      featureId: state.featureId,
      vertexIndex: deletedIndex,
      position: deletedPosition
    })

    // Clear selection after delete
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null })
  }
}
