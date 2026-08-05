import {
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from '../utils/geometryHelpers.js'

/**
 * Undo handlers for edit mode.
 * Each operation receives the OL feature and the saved op payload,
 * mutates the geometry, and returns the vertex index to re-select (or -1).
 */

export const undoMoveVertex = (olFeature, op) => {
  const { vertexIndex, previousCoord } = op
  const geom = olFeature.getGeometry()
  const geojsonGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
  const segments = getRingSegments(geojsonGeom)
  const result = getSegmentForIndex(segments, vertexIndex)
  if (!result) {
    return -1
  }

  const ring = getModifiableCoords(geojsonGeom, result.segment.path)
  ring[result.localIdx] = [...previousCoord]
  if (result.segment.closed && result.localIdx === 0) {
    ring[ring.length - 1] = [...previousCoord]
  }
  geom.setCoordinates(geojsonGeom.coordinates)
  return vertexIndex
}

export const undoInsertVertex = (olFeature, op) => {
  const { vertexIndex } = op
  const geom = olFeature.getGeometry()
  const geojsonGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
  const segments = getRingSegments(geojsonGeom)
  const result = getSegmentForIndex(segments, vertexIndex)
  if (result) {
    const ring = getModifiableCoords(geojsonGeom, result.segment.path)
    ring.splice(result.localIdx, 1)
    if (result.segment.closed) {
      ring[ring.length - 1] = [...ring[0]]
    }
    geom.setCoordinates(geojsonGeom.coordinates)
  }
  // Undoing an insert removes the vertex, so there is never one to re-select
  return -1
}

export const undoDeleteVertex = (olFeature, op) => {
  const { vertexIndex, deletedCoord } = op
  const geom = olFeature.getGeometry()
  const geojsonGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
  const segments = getRingSegments(geojsonGeom)

  let result = getSegmentForIndex(segments, vertexIndex)
  // Vertex might be at a segment boundary after deletion shifted indices
  if (!result) {
    for (const seg of segments) {
      if (vertexIndex === seg.start + seg.length) {
        result = { segment: seg, localIdx: seg.length }
        break
      }
    }
  }
  if (!result) {
    return -1
  }

  const ring = getModifiableCoords(geojsonGeom, result.segment.path)
  ring.splice(result.localIdx, 0, [...deletedCoord])
  if (result.segment.closed) {
    ring[ring.length - 1] = [...ring[0]]
  }
  geom.setCoordinates(geojsonGeom.coordinates)
  return vertexIndex
}

/**
 * Dispatch the correct undo handler based on operation type.
 * @returns {number} vertex index to re-select after undo, or -1 for none
 */
export const applyUndo = (olFeature, op) => {
  switch (op.type) {
    case 'move_vertex':
      return undoMoveVertex(olFeature, op)
    case 'insert_vertex':
      return undoInsertVertex(olFeature, op)
    case 'delete_vertex':
      return undoDeleteVertex(olFeature, op)
    default:
      return -1
  }
}
