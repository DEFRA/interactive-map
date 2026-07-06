import {
  getCoords,
  getRingSegments,
  getSegmentForIndex,
  getModifiableCoords
} from '../utils/geometryHelpers.js'

/**
 * Delete the vertex at `selectedIndex` from the OL feature's geometry.
 * Respects minimum vertex counts (3 for closed rings, 2 for lines).
 *
 * @returns {{ deletedIndex: number, deletedCoord: number[] } | null} undo payload, or null if not deleted
 */
export const deleteVertex = (olFeature, selectedIndex) => {
  const geom = olFeature.getGeometry()
  const geojsonGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
  const coords = getCoords(geojsonGeom)
  const segments = getRingSegments(geojsonGeom)
  const result = getSegmentForIndex(segments, selectedIndex)
  if (!result) {
    return null
  }

  const { segment } = result
  const minVertices = segment.closed ? 3 : 2 // NOSONAR, min vertecies in ring
  if (segment.length <= minVertices) {
    return null
  }

  const deletedCoord = [...coords[selectedIndex]]
  const ring = getModifiableCoords(geojsonGeom, segment.path)
  ring.splice(result.localIdx, 1)
  if (segment.closed) {
    ring[ring.length - 1] = [...ring[0]]
  }

  geom.setCoordinates(geojsonGeom.coordinates)
  return { deletedIndex: selectedIndex, deletedCoord }
}

/**
 * Insert a vertex after `afterIndex` in the OL feature's geometry.
 * Used when the user activates a midpoint (touch tap or keyboard insert).
 *
 * @param {number[][]} midpoints - current midpoint array (from midpointLayer)
 * @param {number} midpointFlatIndex - flat index (vertexCount + midpointOffset)
 * @param {number} vertexCount - number of actual vertices
 * @param {number[][]} vertices - current vertex array
 * @returns {{ insertedIndex: number } | null}
 */
export const insertAtMidpoint = (olFeature, midpoints, midpointFlatIndex, vertexCount) => {
  const midpointLocalIdx = midpointFlatIndex - vertexCount
  const midCoord = midpoints[midpointLocalIdx]
  if (!midCoord) {
    return null
  }

  const geom = olFeature.getGeometry()
  const geojsonGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
  const segments = getRingSegments(geojsonGeom)

  // Map midpoint local index to insertion position in the coordinate array
  let midpointCounter = 0
  for (const seg of segments) {
    const segMidpoints = seg.closed ? seg.length : seg.length - 1
    if (midpointLocalIdx < midpointCounter + segMidpoints) {
      const localMidIdx = midpointLocalIdx - midpointCounter
      const insertLocalIdx = localMidIdx + 1
      const insertGlobalIdx = seg.start + insertLocalIdx
      const ring = getModifiableCoords(geojsonGeom, seg.path)
      ring.splice(insertLocalIdx, 0, [...midCoord])
      geom.setCoordinates(geojsonGeom.coordinates)
      return { insertedIndex: insertGlobalIdx }
    }
    midpointCounter += segMidpoints
  }

  return null
}

/**
 * Move vertex at `index` to `newCoord` in the OL feature's geometry.
 */
export const moveVertex = (olFeature, index, newCoord) => {
  const geom = olFeature.getGeometry()
  const geojsonGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
  const segments = getRingSegments(geojsonGeom)
  const result = getSegmentForIndex(segments, index)
  if (!result) {
    return
  }

  const ring = getModifiableCoords(geojsonGeom, result.segment.path)
  ring[result.localIdx] = [...newCoord]
  if (result.segment.closed && result.localIdx === 0) {
    ring[ring.length - 1] = [...newCoord]
  }
  geom.setCoordinates(geojsonGeom.coordinates)
}
