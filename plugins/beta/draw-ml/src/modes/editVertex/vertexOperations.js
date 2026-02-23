import {
  getCoords,
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from './geometryHelpers.js'

const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }
const NUDGE = 1, STEP = 5

export const vertexOperations = {
  updateMidpoint(coordinates) {
    setTimeout(() => {
      this.map.getSource('mapbox-gl-draw-hot').setData({
        type: 'Feature',
        properties: { meta: 'midpoint', active: 'true', id: 'active-midpoint' },
        geometry: { type: 'Point', coordinates }
      })
    }, 0)
  },

  updateVertex(state, direction) {
    const [idx, type] = this.getVertexOrMidpoint(state, direction)
    if (idx < 0 || !type) {
      return
    }
    this.changeMode(state, { selectedVertexIndex: idx, selectedVertexType: type, ...(type === 'vertex' && { coordPath: this.getCoordPath(state, idx) }) })
  },

  getOffset(coord, e) {
    const pt = this.map.project(coord)
    const offset = e?.shiftKey ? NUDGE : STEP
    const [dx, dy] = e ? ARROW_OFFSETS[e.key].map(v => v * offset) : [0, 0]
    return this.map.unproject({ x: pt.x + dx, y: pt.y + dy })
  },

  getNewCoord(state, e) {
    return this.getOffset(getCoords(this.getFeature(state.featureId))[state.selectedVertexIndex], e)
  },

  insertVertex(state, e) {
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

    if (!insertSegment) return

    const coords = getModifiableCoords(geojson, insertSegment.path)
    coords.splice(localInsertIdx, 0, [newCoord.lng, newCoord.lat])
    this._ctx.api.add(geojson)

    this.pushUndo({ type: 'insert_vertex', featureId: state.featureId, vertexIndex: globalInsertIdx })
    this.changeMode(state, { selectedVertexIndex: globalInsertIdx, selectedVertexType: 'vertex', coordPath: this.getCoordPath(state, globalInsertIdx) })
  },

  moveVertex(state, coord, options = {}) {
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
    if (!result) return

    const coords = getModifiableCoords(geojson, result.segment.path)
    coords[result.localIdx] = [coord.lng, coord.lat]
    this._ctx.api.add(geojson)
    state.vertecies = this.getVerticies(state.featureId)

    this.map.fire('draw.geometrychange', state.feature)
  },

  deleteVertex(state) {
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
    // Minimum vertices per segment: 3 for closed rings (mapbox-gl-draw's internal representation), 2 for lines
    const minVertices = segment.closed ? 3 : 2
    if (segment.length <= minVertices) {
      return
    }

    // Save position for undo before deletion
    const deletedPosition = [...state.vertecies[state.selectedVertexIndex]]
    const deletedIndex = state.selectedVertexIndex

    this._ctx.api.trash()

    // Clear DirectSelect's coordinate selection to prevent visual artifacts
    this.clearSelectedCoordinates()
    // Force feature re-render to clear vertex highlights
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
