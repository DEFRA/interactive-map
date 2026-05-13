import Modify from 'ol/interaction/Modify.js'
import Collection from 'ol/Collection.js'
import { createEditStyle } from '../core/styles.js'
import { createMidpointLayer } from './midpointLayer.js'
import { createTouchHandler } from './touchHandler.js'
import { createKeyboardHandler } from './keyboardHandler.js'
import { findNearest } from './vertexHitTest.js'
import { deleteVertex, insertAtMidpoint } from './vertexOps.js'
import { applyUndo } from './undoOps.js'
import { getCoords, getMidpoints } from '../utils/geometryHelpers.js'

/**
 * Edit vertex mode — handles edit_vertex.
 *
 * OL Modify handles pointer/mouse vertex dragging natively.
 * touchHandler covers touch drag via the SVG offset target.
 * keyboardHandler covers keyboard navigation and nudging.
 *
 * @returns {{ done, cancel, undo, deleteVertex: fn, destroy }}
 */
export const createEditMode = ({ map, manager, options }) => {
  const { featureId, container, interfaceType, deleteVertexButtonId } = options
  const { store, undoStack } = manager

  const olFeature = store.getOL(featureId)
  if (!olFeature) return null

  // Mutable state shared across sub-handlers
  const state = {
    olFeature,
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertecies: [],
    midpoints: [],
    interfaceType: interfaceType ?? 'pointer',
    // Used by createEditStyle to highlight the selected vertex
    selectedCoord: null
  }

  const getState = () => state
  const setState = (updates) => {
    Object.assign(state, updates)
    if (updates.selectedVertexIndex !== undefined) {
      const coord = state.vertecies[state.selectedVertexIndex] ?? null
      state.selectedCoord = coord
      manager.emit('vertexselection', {
        index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
        numVertecies: state.vertecies.length
      })
    }
    if (updates.vertecies !== undefined) {
      midpointLayer.update(olFeature.getGeometry().toJSON?.() ?? {
        type: olFeature.getGeometry().getType(),
        coordinates: olFeature.getGeometry().getCoordinates()
      })
      state.midpoints = midpointLayer.getCoords()
      // Trigger Modify overlay re-render
      map.render()
    }
  }

  const syncGeom = () => {
    const geom = olFeature.getGeometry()
    const plainGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
    state.vertecies = getCoords(plainGeom)
    state.midpoints = getMidpoints(plainGeom)
    midpointLayer.update(plainGeom)
    manager.emit('vertexchange', { numVertecies: state.vertecies.length })
    manager.emit('update', store.toGeoJSON(olFeature))
  }

  // --- Style state ref shared with the style function ---
  const styleState = { selectedCoord: null }
  const editStyleFn = createEditStyle(styleState)

  // --- OL Modify (handles pointer vertex drag + midpoint insertion natively) ---
  const collection = new Collection([olFeature])
  const modifyInteraction = new Modify({
    features: collection,
    style: editStyleFn,
    pixelTolerance: 12
  })
  map.addInteraction(modifyInteraction)

  // Track move start for undo
  let modifyStartCoords = null
  let modifyStartIndex = -1

  modifyInteraction.on('modifystart', () => {
    if (state.interfaceType === 'touch') return
    modifyStartCoords = state.vertecies.map(c => [...c])
  })

  modifyInteraction.on('modifyend', () => {
    if (state.interfaceType === 'touch') return
    const prevCoords = modifyStartCoords
    syncGeom()
    if (!prevCoords) return

    // Detect what changed
    const newCoords = state.vertecies
    if (newCoords.length > prevCoords.length) {
      // Midpoint drag inserted a vertex — find it
      const insertedIdx = newCoords.findIndex((c, i) => !prevCoords[i] || c[0] !== prevCoords[i][0])
      undoStack.push({ type: 'insert_vertex', vertexIndex: Math.max(0, insertedIdx) })
    } else if (newCoords.length === prevCoords.length) {
      const movedIdx = newCoords.findIndex((c, i) => c[0] !== prevCoords[i][0] || c[1] !== prevCoords[i][1])
      if (movedIdx >= 0) {
        undoStack.push({ type: 'move_vertex', vertexIndex: movedIdx, previousCoord: prevCoords[movedIdx] })
        setState({ selectedVertexIndex: movedIdx, selectedVertexType: 'vertex' })
      }
    }
    modifyStartCoords = null
  })

  // --- Midpoint layer ---
  const midpointLayer = createMidpointLayer(map)
  syncGeom() // initial populate

  // --- Pointer hit detection (click selects vertex or midpoint) ---
  const onPointerdown = (e) => {
    if (e.pointerType === 'touch') {
      state.interfaceType = 'touch'
      modifyInteraction.setActive(false)
      return
    }
    state.interfaceType = 'pointer'
    modifyInteraction.setActive(true)

    const olPixel = map.getEventPixel(e)
    const pixel = { x: olPixel[0], y: olPixel[1] }
    const hit = findNearest(map, state.vertecies, state.midpoints, pixel)
    if (hit) {
      setState({ selectedVertexIndex: hit.index, selectedVertexType: hit.type })
      styleState.selectedCoord = state.selectedCoord
    }
  }

  container.addEventListener('pointerdown', onPointerdown)

  // --- Button click (delete vertex) ---
  const onButtonClick = (e) => {
    if (deleteVertexButtonId && e.target.closest(`#${deleteVertexButtonId}`)) {
      doDeleteVertex()
    }
  }
  window.addEventListener('click', onButtonClick)

  // --- Operations ---

  const doDeleteVertex = () => {
    if (state.selectedVertexType !== 'vertex' || state.selectedVertexIndex < 0) return
    const result = deleteVertex(olFeature, state.selectedVertexIndex)
    if (!result) return
    undoStack.push({ type: 'delete_vertex', ...result })
    syncGeom()
    setState({ selectedVertexIndex: -1, selectedVertexType: null })
    styleState.selectedCoord = null
  }

  const doUndo = () => {
    const op = undoStack.pop()
    if (!op) return
    const newIndex = applyUndo(olFeature, op)
    syncGeom()
    setState({
      selectedVertexIndex: newIndex,
      selectedVertexType: newIndex >= 0 ? 'vertex' : null
    })
    styleState.selectedCoord = newIndex >= 0 ? state.vertecies[newIndex] : null
  }

  // --- Touch handler ---
  const touchHandler = createTouchHandler({
    map,
    container,
    getState,
    setState,
    onVertexMoved ({ vertexIndex, previousCoord }) {
      undoStack.push({ type: 'move_vertex', vertexIndex, previousCoord })
      syncGeom()
      touchHandler.updateTargetPosition()
    }
  })

  // --- Keyboard handler ---
  const keyboardHandler = createKeyboardHandler({
    map,
    container,
    getState,
    setState,
    onVertexMoved ({ vertexIndex, previousCoord }) {
      undoStack.push({ type: 'move_vertex', vertexIndex, previousCoord })
      syncGeom()
    },
    onInserted ({ insertedIndex }) {
      undoStack.push({ type: 'insert_vertex', vertexIndex: insertedIndex })
      syncGeom()
    },
    onDeleted: doDeleteVertex,
    onUndo: doUndo
  })

  return {
    done () {
      manager.emit('editfinish', store.toGeoJSON(olFeature))
    },

    cancel () {
      // Restore original feature from store (re-read from initial state)
      // The original was stored as tempFeature in reducer — events.js handles restore
    },

    undo: doUndo,
    deleteVertex: doDeleteVertex,

    destroy () {
      container.removeEventListener('pointerdown', onPointerdown)
      window.removeEventListener('click', onButtonClick)
      map.removeInteraction(modifyInteraction)
      midpointLayer.remove()
      touchHandler.destroy()
      keyboardHandler.destroy()
    }
  }
}
