import DirectSelect from '../../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/direct_select.js' // NOSONAR
import {
  getSnapInstance, isSnapEnabled, getSnapLngLat, triggerSnapAtPoint, clearSnapState
} from '../../utils/snapHelpers.js'
import { getCoords, coordPathToFlatIndex } from './geometryHelpers.js'

const EVENT_VERTEX_SELECTION = 'draw.vertexselection'

/**
 * Mouse/pointer interaction for the vertex-edit mode: vertex/midpoint mouse-down,
 * click-to-commit insertions, drag (with snapping) and mouse-up undo bookkeeping.
 * Wraps the parent DirectSelect handlers. Mixed into EditVertexMode.
 */
export const pointerHandlers = {
  onMouseDown (state, e) {
    clearSnapState(getSnapInstance(this.map))
    const meta = e.featureTarget?.properties.meta
    const coordPath = e.featureTarget?.properties.coord_path

    if (['vertex', 'midpoint'].includes(meta)) {
      state.dragMoveLocation = e.lngLat
      state.dragMoving = false
      DirectSelect.onMouseDown.call(this, state, e)

      // Update selection state for vertex clicks (so onSelectionChange has correct context)
      if (meta === 'vertex' && coordPath) {
        const feature = this.getFeature(state.featureId)
        const vertexIndex = coordPathToFlatIndex(feature, coordPath)
        state.selectedVertexIndex = vertexIndex
        state.selectedVertexType = 'vertex'
        state.coordPath = coordPath
        const vertex = state.vertecies?.[vertexIndex]
        if (vertex) {
          state._moveStartPosition = [...vertex]
          state._moveStartIndex = vertexIndex
        }
      }
    }
    if (meta === 'midpoint') {
      // DirectSelect converts midpoint to vertex - track this as an insert
      const feature = this.getFeature(state.featureId)
      const insertedIndex = coordPathToFlatIndex(feature, coordPath)

      // Track this insertion for undo (will be pushed on mouseUp if drag occurred)
      state._insertedVertexIndex = insertedIndex
      state._isInsertingVertex = true

      state.selectedVertexIndex = this.getVertexIndexFromMidpoint(state, coordPath)
      state.selectedVertexType = 'vertex'
      state.coordPath = null // Clear coordPath for midpoints
      this.map.fire(EVENT_VERTEX_SELECTION, { index: state.selectedVertexIndex, numVertecies: state.vertecies.length })
    }
  },

  onClick (state, e) { // NOSONAR — complexity accumulated from object-level context; single guard clause, see feedback_mgl_click_vs_mouseup.md
    if (state._isInsertingVertex && state._insertedVertexIndex != null) {
      const insertedIndex = state._insertedVertexIndex
      this.syncVertices(state)
      this.pushUndo({ type: 'insert_vertex', featureId: state.featureId, vertexIndex: insertedIndex })
      state.selectedVertexIndex = insertedIndex
      state.selectedVertexType = 'vertex'
      state._isInsertingVertex = false
      state._insertedVertexIndex = null
      this.map.fire(EVENT_VERTEX_SELECTION, { index: insertedIndex, numVertecies: state.vertecies.length })
      return
    }
    DirectSelect.onClick.call(this, state, e)
  },

  onMouseUp (state, e) {
    clearSnapState(getSnapInstance(this.map))

    const wasInsertion = state._isInsertingVertex && state._insertedVertexIndex != null
    const vertexMoved = this._didVertexMove(state)

    if (state.dragMoving || vertexMoved || wasInsertion) {
      this.syncVertices(state)
      if (wasInsertion) {
        this._recordInsertionUndo(state)
      } else if (vertexMoved) {
        this._recordMoveUndo(state)
      } else {
        // dragMoving without an actual move or insertion: nothing to record
      }
    }

    // Clean up move state
    state._moveStartPosition = null
    state._moveStartIndex = null

    DirectSelect.onMouseUp.call(this, state, e)
  },

  // Did the selected vertex actually change position during this interaction?
  // Reads the live feature (not the cached state.vertecies) for reliability.
  _didVertexMove (state) {
    if (!state._moveStartPosition || state._moveStartIndex == null) {
      return false
    }
    const feature = this.getFeature(state.featureId)
    const currentVertex = feature && getCoords(feature)?.[state._moveStartIndex]
    if (!currentVertex) {
      return false
    }
    return currentVertex[0] !== state._moveStartPosition[0] ||
           currentVertex[1] !== state._moveStartPosition[1]
  },

  // Commit a midpoint-drag insertion: record undo, reselect the new vertex, broadcast the count.
  _recordInsertionUndo (state) {
    const insertedIndex = state._insertedVertexIndex
    this.pushUndo({ type: 'insert_vertex', featureId: state.featureId, vertexIndex: insertedIndex })
    // selectedVertexIndex pointed at the old midpoint-range index; use the real flat index
    state.selectedVertexIndex = insertedIndex
    state.selectedVertexType = 'vertex'
    state._isInsertingVertex = false
    state._insertedVertexIndex = null
    // DirectSelect.onMouseUp fires draw.update but not draw.selectionchange, so broadcast the count here
    this.map.fire(EVENT_VERTEX_SELECTION, { index: insertedIndex, numVertecies: state.vertecies.length })
  },

  _recordMoveUndo (state) {
    this.pushUndo({
      type: 'move_vertex',
      featureId: state.featureId,
      vertexIndex: state._moveStartIndex,
      previousPosition: state._moveStartPosition
    })
  },

  onDrag (state, e) {
    if (state.interfaceType === 'touch') {
      return
    }

    this.map.fire('draw.geometrychange', state.feature)

    const snap = getSnapInstance(this.map)
    if (snap) {
      snap.snapStatus = false
      snap.snapCoords = null
    }

    if (!isSnapEnabled(state) || !snap?.status) {
      DirectSelect.onDrag.call(this, state, e)
      return
    }

    if (!state.selectedCoordPaths?.length || !state.canDragMove) {
      return
    }

    state.dragMoving = true
    e.originalEvent.stopPropagation()
    triggerSnapAtPoint(snap, this.map, e.point)

    const finalLngLat = getSnapLngLat(snap) || e.lngLat
    state.feature.updateCoordinate(state.selectedCoordPaths[0], finalLngLat.lng, finalLngLat.lat)
    state.dragMoveLocation = e.lngLat
  }
}
