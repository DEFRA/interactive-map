import {
  getCoords,
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from './geometryHelpers.js'
import { KEYBOARD } from '../../defaults.js'
import {
  getSnapInstance, isSnapActive, isSnapEnabled, getSnapLngLat,
  getSnapRadius, triggerSnapAtPoint, clearSnapIndicator
} from '../../utils/snapHelpers.js'
import { MIN_VERTICES } from '../../../../validation/rules.js'

const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

export const vertexOperations = {
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

  getOffset (coord, e) {
    const pt = this.map.project(coord)
    const offset = e?.shiftKey ? KEYBOARD.nudgeAmount : KEYBOARD.stepAmount
    const [dx, dy] = e ? ARROW_OFFSETS[e.key].map(v => v * offset) : [0, 0]
    return this.map.unproject({ x: pt.x + dx, y: pt.y + dy })
  },

  getNewCoord (state, e) {
    return this.getOffset(getCoords(this.getFeature(state.featureId))[state.selectedVertexIndex], e)
  },

  // Explicit-delta counterpart to getOffset, driven by a unit direction vector and
  // MoveControls' own Precision toggle rather than a KeyboardEvent — used by
  // nudgeVertexByDelta below.
  getOffsetByDelta (coord, dx, dy, isLargeStep) {
    const pt = this.map.project(coord)
    const amount = isLargeStep ? KEYBOARD.stepAmount : KEYBOARD.nudgeAmount
    return this.map.unproject({ x: pt.x + dx * amount, y: pt.y + dy * amount })
  },

  // Resolves the destination coordinate for a vertex nudge by (dx, dy) unit
  // direction, applying snap or breaking out of an already-active one — shared by
  // the keyboard arrow-key path (_keyboardMoveTarget) and MoveControls'
  // explicit-delta path (nudgeVertexByDelta) so both snap identically. dx/dy are
  // only needed for the snap-escape offset; getCandidate computes the raw,
  // un-snapped destination the caller would otherwise have used.
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
