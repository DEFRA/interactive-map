import Modify from 'ol/interaction/Modify.js'
import Collection from 'ol/Collection.js'
import { findNearest, PIXEL_TOLERANCE } from './vertexHitTest.js'

/**
 * Derive the undo operation from the vertex arrays before and after an OL
 * Modify drag. A grown array means a midpoint drag inserted a vertex; an
 * equal-length array with a changed coordinate means a vertex move.
 *
 * @param {number[][]} prevCoords - vertices snapshotted at modifystart
 * @param {number[][]} newCoords - vertices after modifyend
 * @returns {{ type: string, vertexIndex: number, previousCoord?: number[] } | null}
 */
export const deriveModifyOp = (prevCoords, newCoords) => {
  if (newCoords.length > prevCoords.length) {
    const insertedIdx = newCoords.findIndex((c, i) => c[0] !== prevCoords[i]?.[0])
    return { type: 'insert_vertex', vertexIndex: Math.max(0, insertedIdx) }
  }
  if (newCoords.length === prevCoords.length) {
    const movedIdx = newCoords.findIndex((c, i) => c[0] !== prevCoords[i][0] || c[1] !== prevCoords[i][1])
    if (movedIdx >= 0) {
      return { type: 'move_vertex', vertexIndex: movedIdx, previousCoord: prevCoords[movedIdx] }
    }
  }
  return null
}

// Only activate Modify when clicking on a vertex/midpoint handle, never for the
// touch interface (touchHandler covers touch drags via the SVG offset target)
export const buildModifyCondition = ({ map, getState }) => (mapBrowserEvent) => {
  const { interfaceType, vertices, midpoints } = getState()
  if (interfaceType === 'touch') {
    return false
  }
  const olPixel = map.getEventPixel(mapBrowserEvent.originalEvent)
  return findNearest(map, vertices, midpoints, { x: olPixel[0], y: olPixel[1] }) !== null
}

/**
 * OL Modify interaction wiring for edit mode.
 *
 * Modify handles pointer vertex dragging and midpoint insertion natively; this
 * wrapper restricts it to clicks on a handle (buildModifyCondition) and reports
 * each completed drag via `onModifyEnd(prevCoords)` with the vertices
 * snapshotted at drag start.
 *
 * @returns {{ destroy: () => void }}
 */
export const createModifyInteraction = ({ map, olFeature, getState, onModifyEnd }) => {
  const condition = buildModifyCondition({ map, getState })

  const modifyInteraction = new Modify({
    features: new Collection([olFeature]),
    style: () => [], // vertex circles rendered by vertexLayer instead
    pixelTolerance: PIXEL_TOLERANCE,
    condition
  })
  map.addInteraction(modifyInteraction)

  let startCoords = null

  modifyInteraction.on('modifystart', () => {
    if (getState().interfaceType === 'touch') {
      return
    }
    startCoords = getState().vertices.map(c => [...c])
  })

  modifyInteraction.on('modifyend', () => {
    if (getState().interfaceType === 'touch') {
      return
    }
    const prevCoords = startCoords
    startCoords = null
    onModifyEnd(prevCoords)
  })

  return {
    destroy () {
      map.removeInteraction(modifyInteraction)
    }
  }
}
