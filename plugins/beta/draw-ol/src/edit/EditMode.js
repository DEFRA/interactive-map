import Modify from 'ol/interaction/Modify.js'
import Collection from 'ol/Collection.js'
import VectorSource from 'ol/source/Vector.js'
import VectorLayer from 'ol/layer/Vector.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import { createMidpointLayer } from './midpointLayer.js'
import { createVertexLayer } from './vertexLayer.js'
import { createTouchHandler } from './touchHandler.js'
import { createKeyboardHandler } from './keyboardHandler.js'
import { findNearest } from './vertexHitTest.js'
import { deleteVertex, insertAtMidpoint } from './vertexOps.js'
import { applyUndo } from './undoOps.js'
import { getCoords, getMidpoints } from '../utils/geometryHelpers.js'
import { editFeatureStyle, selectedVertexStyle, selectedMidpointStyle } from '../core/styles.js'

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

  const originalFeatureStyle = olFeature.getStyle()
  olFeature.setStyle(editFeatureStyle)

  // Mutable state shared across sub-handlers
  const state = {
    olFeature,
    selectedVertexIndex: -1,
    selectedVertexType: null,
    vertecies: [],
    midpoints: [],
    interfaceType: interfaceType ?? 'pointer'
  }

  const getState = () => state
  let onDeselect = null  // set after touchHandler is created; hides offset target on any deselect
  let onUpdate = null   // set after touchHandler is created; repositions offset target when vertex coords change

  const setState = (updates) => {
    Object.assign(state, updates)
    if (updates.selectedVertexIndex !== undefined) {
      vertexLayer.setSelected(state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1)
      midpointLayer.setSelected(
        state.selectedVertexType === 'midpoint' ? state.selectedVertexIndex - state.vertecies.length : -1
      )
      if (state.selectedVertexIndex < 0) { onDeselect?.() }
      updateActiveLayer()
      manager.emit('vertexselection', {
        index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
        numVertecies: state.vertecies.length
      })
    }
    if (updates.vertecies !== undefined) {
      const plainGeom = {
        type: olFeature.getGeometry().getType(),
        coordinates: olFeature.getGeometry().getCoordinates()
      }
      midpointLayer.update(plainGeom)
      vertexLayer.update(plainGeom)
      state.midpoints = midpointLayer.getCoords()
      updateActiveLayer()
      onUpdate?.()
      map.render()
    }
  }

  // Lightweight per-frame update during drag — updates layers without emitting events
  const updateLayersFromGeom = () => {
    const geom = olFeature.getGeometry()
    const plainGeom = { type: geom.getType(), coordinates: geom.getCoordinates() }
    state.vertecies = getCoords(plainGeom)
    state.midpoints = getMidpoints(plainGeom)
    midpointLayer.update(plainGeom)
    vertexLayer.update(plainGeom)
    updateActiveLayer()
  }

  const syncGeom = () => {
    updateLayersFromGeom()
    manager.emit('vertexchange', { numVertecies: state.vertecies.length })
    manager.emit('update', store.toGeoJSON(olFeature))
  }

  // Keep overlay layers in sync on every geometry change (e.g. during pointer drag)
  const onGeometryChange = () => updateLayersFromGeom()
  olFeature.getGeometry().on('change', onGeometryChange)

  // --- OL Modify (handles pointer vertex drag + midpoint insertion natively) ---
  const collection = new Collection([olFeature])
  const modifyInteraction = new Modify({
    features: collection,
    style: () => [],  // vertex circles rendered by vertexLayer instead
    pixelTolerance: 12,
    // Only activate when clicking on a vertex or midpoint circle, not anywhere on a segment.
    // Touch drags are handled by touchHandler; returning false here lets them pass through to
    // DragPan (touchHandler uses preventDefault on the offset target to stop unwanted panning).
    condition: (mapBrowserEvent) => {
      if (state.interfaceType === 'touch') return false
      const olPixel = map.getEventPixel(mapBrowserEvent.originalEvent)
      return findNearest(map, state.vertecies, state.midpoints, { x: olPixel[0], y: olPixel[1] }) !== null
    }
  })
  map.addInteraction(modifyInteraction)

  // Track move start for undo
  let modifyStartCoords = null

  modifyInteraction.on('modifystart', () => {
    if (state.interfaceType === 'touch') return
    modifyStartCoords = state.vertecies.map(c => [...c])
  })

  modifyInteraction.on('modifyend', () => {
    if (state.interfaceType === 'touch') return
    const prevCoords = modifyStartCoords
    syncGeom()
    if (!prevCoords) return

    const newCoords = state.vertecies
    if (newCoords.length > prevCoords.length) {
      // Midpoint drag inserted a vertex — find it and select it
      const insertedIdx = newCoords.findIndex((c, i) => !prevCoords[i] || c[0] !== prevCoords[i][0])
      const idx = Math.max(0, insertedIdx)
      undoStack.push({ type: 'insert_vertex', vertexIndex: idx })
      setState({ selectedVertexIndex: idx, selectedVertexType: 'vertex' })
    } else if (newCoords.length === prevCoords.length) {
      const movedIdx = newCoords.findIndex((c, i) => c[0] !== prevCoords[i][0] || c[1] !== prevCoords[i][1])
      if (movedIdx >= 0) {
        undoStack.push({ type: 'move_vertex', vertexIndex: movedIdx, previousCoord: prevCoords[movedIdx] })
        setState({ selectedVertexIndex: movedIdx, selectedVertexType: 'vertex' })
      }
    }
    modifyStartCoords = null
  })

  // --- Vertex + midpoint layers (always-visible handles) ---
  const midpointLayer = createMidpointLayer(map)
  const vertexLayer = createVertexLayer(map)

  // --- Active selection overlay — always on top of vertex and midpoint layers ---
  const activeSource = new VectorSource()
  const activeLayer = new VectorLayer({ source: activeSource, zIndex: 103 })
  map.addLayer(activeLayer)

  const updateActiveLayer = () => {
    activeSource.clear()
    const { selectedVertexIndex, selectedVertexType, vertecies, midpoints } = state
    if (selectedVertexIndex < 0) { return }
    let coord, style
    if (selectedVertexType === 'vertex') {
      coord = vertecies[selectedVertexIndex]
      style = selectedVertexStyle
    } else if (selectedVertexType === 'midpoint') {
      coord = midpoints[selectedVertexIndex - vertecies.length]
      style = selectedMidpointStyle
    } else {
      return
    }
    if (!coord) { return }
    const f = new Feature({ geometry: new Point(coord) })
    f.setStyle(style)
    activeSource.addFeature(f)
  }

  syncGeom() // initial populate

  // --- Pointer hit detection ---
  const onPointerdown = (e) => {
    if (e.pointerType === 'touch') {
      state.interfaceType = 'touch'
      touchHandler.updateTargetPosition()
      return
    }
    state.interfaceType = 'pointer'

    const olPixel = map.getEventPixel(e)
    const pixel = { x: olPixel[0], y: olPixel[1] }
    const hit = findNearest(map, state.vertecies, state.midpoints, pixel)
    if (hit?.type === 'vertex') {
      setState({ selectedVertexIndex: hit.index, selectedVertexType: 'vertex' })
    }
  }

  // click fires after OL Modify finishes, so state.vertecies reflects any insertions/moves
  const onContainerClick = (e) => {
    if (state.interfaceType === 'touch') { return }
    const olPixel = map.getEventPixel(e)
    const pixel = { x: olPixel[0], y: olPixel[1] }
    const hit = findNearest(map, state.vertecies, state.midpoints, pixel)
    if (hit?.type === 'vertex') {
      setState({ selectedVertexIndex: hit.index, selectedVertexType: 'vertex' })
    } else if (hit?.type === 'midpoint') {
      // modifyend already selected the inserted vertex — nothing to do here
    } else {
      setState({ selectedVertexIndex: -1, selectedVertexType: null })
    }
  }

  // Switch to pointer mode and hide the touch target as soon as the mouse moves.
  const onPointerMove = (e) => {
    if (e.pointerType !== 'mouse') return
    if (state.interfaceType === 'pointer') return
    state.interfaceType = 'pointer'
    touchHandler.hide()
  }

  container.addEventListener('pointerdown', onPointerdown)
  container.addEventListener('pointerenter', onPointerMove)
  container.addEventListener('pointermove', onPointerMove)
  container.addEventListener('click', onContainerClick)

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
    onUpdate?.()
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
    },
    onTap (hit) {
      if (!hit) {
        setState({ selectedVertexIndex: -1, selectedVertexType: null })
        return
      }
      if (hit.type === 'vertex') {
        setState({ selectedVertexIndex: hit.index, selectedVertexType: 'vertex' })
        touchHandler.updateTargetPosition()
        return
      }
      if (hit.type === 'midpoint') {
        const result = insertAtMidpoint(olFeature, state.midpoints, hit.index, state.vertecies.length)
        if (!result) { return }
        undoStack.push({ type: 'insert_vertex', vertexIndex: result.insertedIndex })
        syncGeom()
        setState({ selectedVertexIndex: result.insertedIndex, selectedVertexType: 'vertex' })
        touchHandler.updateTargetPosition()
      }
    }
  })
  onDeselect = () => touchHandler.hide()
  onUpdate = () => {
    if (state.interfaceType === 'touch') { touchHandler.updateTargetPosition() }
  }

  // Reposition the touch target after OL re-renders with the new size.
  // change:size fires before the render, so we wait for postrender to get
  // correct pixel coords from getPixelFromCoordinate.
  const onMapSizeChange = () => {
    if (state.interfaceType !== 'touch' || state.selectedVertexIndex < 0) return
    map.once('postrender', () => touchHandler.updateTargetPosition())
  }
  map.on('change:size', onMapSizeChange)

  // --- Keyboard handler ---
  const keyboardHandler = createKeyboardHandler({
    map,
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
    onUndo: doUndo,
    onKeyboardActive () {
      if (state.interfaceType === 'keyboard') return
      state.interfaceType = 'keyboard'
      touchHandler.hide()
      container.focus({ preventScroll: true })
    }
  })

  return {
    setInterfaceType (type) {
      if (type === state.interfaceType) return
      state.interfaceType = type
      if (type === 'touch') {
        touchHandler.updateTargetPosition()
      } else {
        touchHandler.hide()
      }
    },

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
      olFeature.setStyle(originalFeatureStyle)
      olFeature.getGeometry().un('change', onGeometryChange)
      container.removeEventListener('pointerdown', onPointerdown)
      container.removeEventListener('pointerenter', onPointerMove)
      container.removeEventListener('pointermove', onPointerMove)
      container.removeEventListener('click', onContainerClick)
      window.removeEventListener('click', onButtonClick)
      map.un('change:size', onMapSizeChange)
      map.removeInteraction(modifyInteraction)
      activeSource.clear()
      map.removeLayer(activeLayer)
      midpointLayer.remove()
      vertexLayer.remove()
      touchHandler.destroy()
      keyboardHandler.destroy()
    }
  }
}
