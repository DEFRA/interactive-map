import DirectSelect from '../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/direct_select.js'
import {
  getSnapInstance, isSnapActive, isSnapEnabled, getSnapLngLat,
  getSnapRadius, triggerSnapAtPoint, clearSnapIndicator, clearSnapState
} from '../utils/snapHelpers.js'
import { getCoords, coordPathToFlatIndex } from './editVertex/geometryHelpers.js'
import { scalePoint } from './editVertex/helpers.js'
import { undoHandlers } from './editVertex/undoHandlers.js'
import { touchHandlers } from './editVertex/touchHandlers.js'
import { vertexOperations } from './editVertex/vertexOperations.js'
import { vertexQueries } from './editVertex/vertexQueries.js'

const ARROW_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const ARROW_OFFSETS = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }

export const EditVertexMode = {
  ...DirectSelect,
  ...undoHandlers,
  ...touchHandlers,
  ...vertexOperations,
  ...vertexQueries,

  onSetup(options) {
    const state = DirectSelect.onSetup.call(this, options)
    Object.assign(state, {
      container: options.container,
      interfaceType: options.interfaceType,
      deleteVertexButtonId: options.deleteVertexButtonId,
      undoButtonId: options.undoButtonId,
      isPanEnabled: options.isPanEnabled,
      getSnapEnabled: options.getSnapEnabled,
      featureId: state.featureId || options.featureId,
      selectedVertexIndex: options.selectedVertexIndex ?? -1,
      selectedVertexType: options.selectedVertexType,
      coordPath: options.coordPath,
      scale: options.scale ?? 1
    })

    // Get feature type for later reference
    const feature = this.getFeature(state.featureId)
    state.featureType = feature?.type

    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
    this.setupEventListeners(state)

    if (options.selectedVertexType === 'midpoint') {
      // Clear any vertex selection when switching to midpoint
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      // Force feature re-render to clear vertex highlights
      if (state.feature) {
        state.feature.changed()
      }
      this._ctx.store.render()
      this.updateMidpoint(state.midpoints[options.selectedVertexIndex - state.vertecies.length])
    } else if (options.selectedVertexIndex === -1) {
      // Explicitly clear selection when re-entering with no vertex selected
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      if (state.feature) {
        state.feature.changed()
      }
      this._ctx.store.render()
    }
    this.addTouchVertexTarget(state)

    // Clear any snap indicator when entering edit mode
    const snap = getSnapInstance(this.map)
    if (snap) {
      clearSnapIndicator(snap, this.map)
    }

    // Show touch target if entering with a selected vertex on touch interface
    if (state.interfaceType === 'touch' && state.selectedVertexIndex >= 0 && state.selectedVertexType === 'vertex') {
      const vertex = state.vertecies[state.selectedVertexIndex]
      if (vertex) {
        setTimeout(() => {
          this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
        }, 0)
      }
    }

    // Ignore pointermove deselection briefly after setup to let Safari settle
    state._ignorePointermoveDeselect = true
    setTimeout(() => { state._ignorePointermoveDeselect = false }, 100)

    return state
  },

  setupEventListeners(state) {
    const bind = (fn) => (e) => fn.call(this, state, e)
    const h = this.handlers = {
      keydown: bind(this.onKeydown), keyup: bind(this.onKeyup),
      pointerdown: bind(this.onPointerevent), pointermove: bind(this.onPointerevent), pointerup: bind(this.onPointerevent),
      click: bind(this.onButtonClick),
      touchstart: bind(this.onTouchstart), touchmove: bind(this.onTouchmove), touchend: bind(this.onTouchend),
      selectionchange: bind(this.onSelectionChange), scalechange: bind(this.onScaleChange),
      update: bind(this.onUpdate), move: bind(this.onMove)
    }

    window.addEventListener('keydown', h.keydown, { capture: true })
    window.addEventListener('keyup', h.keyup, { capture: true })
    window.addEventListener('click', h.click)
    state.container.addEventListener('pointerdown', h.pointerdown)
    state.container.addEventListener('pointermove', h.pointermove)
    state.container.addEventListener('pointerup', h.pointerup)
    state.container.addEventListener('touchstart', h.touchstart, { passive: false })
    state.container.addEventListener('touchmove', h.touchmove, { passive: false })
    state.container.addEventListener('touchend', h.touchend, { passive: false })
    this.map.on('draw.selectionchange', h.selectionchange)
    this.map.on('draw.scalechange', h.scalechange)
    this.map.on('draw.update', h.update)
    this.map.on('move', h.move)
  },

  onSelectionChange(state, e) {
    const vertexCoord = e.points[e.points.length - 1]?.geometry.coordinates

    // Only update selectedVertexIndex from event if not keyboard mode AND event has valid vertex
    // For keyboard mode or when we have coordPath, trust the existing selectedVertexIndex
    if (state.interfaceType !== 'keyboard' && vertexCoord && !state.coordPath) {
      // No coordPath available - need to search for vertex by coordinates
      const geom = e.features[0]?.geometry
      const coords = getCoords(geom)
      state.selectedVertexIndex = this.findVertexIndex(coords, vertexCoord, state.selectedVertexIndex)
    }
    // If we have coordPath, selectedVertexIndex is already correct from onTap/changeMode

    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null

    this.map.fire('draw.vertexselection', {
      index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
      numVertecies: state.vertecies.length
    })

    // Use vertex from event if available, otherwise fall back to state
    const vertex = vertexCoord || (state.selectedVertexIndex >= 0 ? state.vertecies[state.selectedVertexIndex] : null)
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onScaleChange(state, e) {
    state.scale = e.scale
  },

  onUpdate(state) {
    const prev = new Set(state.vertecies.map(c => JSON.stringify(c)))
    if (prev.size === state.vertecies.length) {
      return
    }
    state.selectedVertexIndex = state.vertecies.findIndex(c => !prev.has(JSON.stringify(c)))
    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null
  },

  onKeydown(state, e) {
    state.interfaceType = 'keyboard'
    this.hideTouchVertexIndicator(state)

    if (e.key === ' ' && state.selectedVertexIndex < 0) {
      // Clear snap indicator when starting keyboard selection
      const snap = getSnapInstance(this.map)
      if (snap) {
        clearSnapIndicator(snap, this.map)
      }

      // Ensure we have vertices to select
      if (!state.vertecies?.length) {
        state.vertecies = this.getVerticies(state.featureId)
        state.midpoints = this.getMidpoints(state.featureId)
      }
      if (!state.vertecies?.length) {
        return
      }
      state.isPanEnabled = false
      return this.updateVertex(state)
    }

    if (!e.altKey && ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      if (state.selectedVertexType === 'midpoint') {
        return this.insertVertex(state, e)
      }

      const snap = getSnapInstance(this.map)
      const feature = this.getFeature(state.featureId)
      if (!feature) {
        return
      }
      const coords = getCoords(feature)
      const currentCoord = coords?.[state.selectedVertexIndex]
      if (!currentCoord) {
        return
      }

      // Save starting position for undo (only on first move of sequence)
      if (!state._keyboardMoveStartPosition) {
        state._keyboardMoveStartPosition = [...currentCoord]
        state._keyboardMoveStartIndex = state.selectedVertexIndex
      }

      // Break out of snap by moving outside snap radius
      if (isSnapEnabled(state) && state._isSnapped && snap) {
        const offset = getSnapRadius(snap) + 1
        const pt = this.map.project(currentCoord)
        const [dx, dy] = ARROW_OFFSETS[e.key].map(v => v * offset)
        state._isSnapped = false
        clearSnapIndicator(snap, this.map)
        return this.moveVertex(state, this.map.unproject({ x: pt.x + dx, y: pt.y + dy }))
      }

      const newCoord = this.getNewCoord(state, e)
      if (isSnapEnabled(state) && snap) {
        triggerSnapAtPoint(snap, this.map, this.map.project(newCoord))
        if (isSnapActive(snap)) {
          state._isSnapped = true
          return this.moveVertex(state, getSnapLngLat(snap))
        }
      }
      state._isSnapped = false
      return this.moveVertex(state, newCoord)
    }

    if (e.altKey && ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.preventDefault()
      e.stopPropagation()
      return this.updateVertex(state, e.key)
    }

    if (e.key === 'Escape') {
      this.changeMode(state, { isPanEnabled: true, selectedVertexIndex: -1, selectedVertexType: null })
    }

    // Undo with Cmd/Ctrl+Z (works without viewport focus, but not in input fields)
    if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      return this.handleUndo(state)
    }
  },

  onKeyup(state, e) {
    state.interfaceType = 'keyboard'
    if (ARROW_KEYS.has(e.key) && state.selectedVertexIndex >= 0) {
      e.stopPropagation()

      // Push undo for keyboard move sequence
      if (state._keyboardMoveStartPosition && state._keyboardMoveStartIndex !== undefined) {
        this.pushUndo({
          type: 'move_vertex',
          featureId: state.featureId,
          vertexIndex: state._keyboardMoveStartIndex,
          previousPosition: state._keyboardMoveStartPosition
        })
        state._keyboardMoveStartPosition = null
        state._keyboardMoveStartIndex = undefined
      }
    }
    if (e.key === 'Delete') {
      this.deleteVertex(state)
    }
  },

  onMouseDown(state, e) {
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
      this.map.fire('draw.vertexselection', { index: state.selectedVertexIndex, numVertecies: state.vertecies.length })
    }
  },

  onMouseUp(state, e) {
    clearSnapState(getSnapInstance(this.map))

    // Check if vertex actually moved by comparing current position to start position
    // This is more robust than relying on state.dragMoving which can be inconsistent
    // IMPORTANT: Get current position from the feature, not state.vertecies (which is cached)
    let vertexMoved = false
    if (state._moveStartPosition && state._moveStartIndex !== undefined) {
      const feature = this.getFeature(state.featureId)
      if (feature) {
        const currentVertex = getCoords(feature)?.[state._moveStartIndex]
        if (currentVertex) {
          vertexMoved = currentVertex[0] !== state._moveStartPosition[0] ||
                        currentVertex[1] !== state._moveStartPosition[1]
        }
      }
    }

    // Also check for insertions (dragMoving is reliable for midpoint drags)
    const wasInsertion = state._isInsertingVertex && state._insertedVertexIndex !== undefined

    if (state.dragMoving || vertexMoved || wasInsertion) {
      this.syncVertices(state)

      // Push undo for vertex insertion (from dragging midpoint)
      if (wasInsertion) {
        const insertedIndex = state._insertedVertexIndex
        this.pushUndo({
          type: 'insert_vertex',
          featureId: state.featureId,
          vertexIndex: insertedIndex
        })
        // selectedVertexIndex was pointing to the old midpoint-range index;
        // update it to the actual flat index of the newly inserted vertex
        state.selectedVertexIndex = insertedIndex
        state.selectedVertexType = 'vertex'
        state._isInsertingVertex = false
        state._insertedVertexIndex = undefined
      }
      // Push undo for the move if vertex actually moved
      else if (vertexMoved && state._moveStartPosition && state._moveStartIndex !== undefined) {
        this.pushUndo({
          type: 'move_vertex',
          featureId: state.featureId,
          vertexIndex: state._moveStartIndex,
          previousPosition: state._moveStartPosition
        })
      }
    }

    // Clean up move state
    state._moveStartPosition = null
    state._moveStartIndex = null

    DirectSelect.onMouseUp.call(this, state, e)
  },

  onDrag(state, e) {
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
  },

  onMove(state) {
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  onButtonClick(state, e) {
    if (e.target.closest(`#${state.deleteVertexButtonId}`) && state.selectedVertexType === 'vertex') {
      this.deleteVertex(state)
    }
    if (e.target.closest(`#${state.undoButtonId}`)) {
      this.handleUndo(state)
    }
  },

  clickNoTarget(state) {
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null, isPanEnabled: true })
  },

  // Prevent selecting other features
  changeMode(state, updates) {
    if (!state.featureId) {
      return
    }
    this._ctx.api.changeMode('edit_vertex', { ...state, ...updates })
  },

  onStop(state) {
    const h = this.handlers
    state.container.removeEventListener('pointerdown', h.pointerdown)
    state.container.removeEventListener('pointermove', h.pointermove)
    state.container.removeEventListener('pointerup', h.pointerup)
    state.container.removeEventListener('touchstart', h.touchstart)
    state.container.removeEventListener('touchmove', h.touchmove)
    state.container.removeEventListener('touchend', h.touchend)
    this.map.off('draw.selectionchange', h.selectionchange)
    this.map.off('draw.scalechange', h.scalechange)
    this.map.off('draw.update', h.update)
    this.map.off('move', h.move)
    this.map.dragPan.enable()
    window.removeEventListener('click', h.click)
    window.removeEventListener('keydown', h.keydown, { capture: true })
    window.removeEventListener('keyup', h.keyup, { capture: true })
    this.hideTouchVertexIndicator(state)
  }
}
