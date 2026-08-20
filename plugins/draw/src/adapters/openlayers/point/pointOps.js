/**
 * Coordinate mutation for edit_point. A Point has one coordinate, always selected — no
 * ring/segment bookkeeping the way edit/undoOps.js and edit/vertexOps.js need for a
 * Polygon/LineString. movePoint's (olFeature, _index, coord) signature matches
 * edit/vertexOps.js's moveVertex exactly (the unused index is only there so nudge.js/
 * touchHandler.js can call either interchangeably via the injected moveCoord parameter).
 */

/** Signature-compatible with edit/vertexOps.js's moveVertex — _index is unused, a Point has none. */
export const movePoint = (olFeature, _index, coord) => {
  olFeature.getGeometry().setCoordinates([...coord])
}

// Op type stays 'move_vertex' (not 'move_point') — deriveModifyOp (edit/modifyInteraction.js,
// reused unchanged) always produces that type, and keeping it lets applyPointUndo below mirror
// edit/undoOps.js's applyUndo dispatch pattern with the shared leaf handlers' onVertexMoved
// callbacks (which push {type: 'move_vertex', ...}) working completely unmodified.
export const undoMovePoint = (olFeature, op) => {
  const { previousCoord } = op
  olFeature.getGeometry().setCoordinates([...previousCoord])
  return 0
}

/**
 * Dispatch the correct undo handler based on operation type — mirrors edit/undoOps.js's
 * applyUndo, but with the single op type a Point ever produces.
 * @returns {number} vertex index to re-select after undo (always 0), or -1 for none
 */
export const applyPointUndo = (olFeature, op) => {
  switch (op.type) {
    case 'move_vertex':
      return undoMovePoint(olFeature, op)
    default:
      return -1
  }
}
