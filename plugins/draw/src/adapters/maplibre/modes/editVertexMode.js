import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { CUSTOM_DRAW_EVENTS } from '../drawEvents.js'
import { getCoords } from './editVertexMode/geometryHelpers.js'
import { scalePoint } from './editVertexMode/helpers.js'
import { bindEditModeListeners, unbindEditModeListeners, clearActiveSnapIndicator, buildEditModeHandlers } from '../utils/editModeEvents.js'
import { undoHandlers } from './editVertexMode/undoHandlers.js'
import { touchHandlers } from './editVertexMode/touchHandlers.js'
import { vertexOperations } from './editVertexMode/vertexOperations.js'
import { vertexQueries } from './editVertexMode/vertexQueries.js'
import { keyboardHandlers } from './editVertexMode/keyboardHandlers.js'
import { pointerHandlers } from './editVertexMode/pointerHandlers.js'

export const EditVertexMode = {
  ...MapboxDraw.modes.direct_select,
  ...undoHandlers,
  ...touchHandlers,
  ...vertexOperations,
  ...vertexQueries,
  ...keyboardHandlers,
  ...pointerHandlers,

  onSetup (options) {
    const state = MapboxDraw.modes.direct_select.onSetup.call(this, options)
    Object.assign(state, {
      container: options.container,
      interfaceType: options.interfaceType,
      deleteVertexButtonId: options.deleteVertexButtonId,
      undoButtonId: options.undoButtonId,
      isPanEnabled: options.isPanEnabled,
      getSnapEnabled: options.getSnapEnabled,
      featureId: state.featureId,
      selectedVertexIndex: options.selectedVertexIndex ?? -1,
      selectedVertexType: options.selectedVertexType,
      coordPath: options.coordPath,
      scale: options.scale ?? 1
    })

    // Clear the undo stack only when starting a new editing session for this feature.
    if (this.map._lastEditFeatureId !== state.featureId) {
      this.map._undoStack?.clear()
      this.map._lastEditFeatureId = state.featureId
    }

    // Get feature type for later reference
    const feature = this.getFeature(state.featureId)
    state.featureType = feature?.type

    state.vertices = this.getVertices(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
    this.setupEventListeners(state)

    this.applyVertexSelection(state, options)
    this.map._drawEditContainer = options.container
    this.addTouchVertexTarget(state)

    // Clear any snap indicator when entering edit mode
    clearActiveSnapIndicator(this.map)

    // Show touch target if entering with a selected vertex on touch interface
    if (state.interfaceType === 'touch' && state.selectedVertexIndex >= 0 && state.selectedVertexType === 'vertex') {
      const vertex = state.vertices[state.selectedVertexIndex]
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

  setupEventListeners (state) {
    const handlers = this.handlers = buildEditModeHandlers(this, state, {
      nudge: this.onNudgeVertex,
      selectionchange: this.onSelectionChange,
      update: this.onUpdate,
      selectvertex: this.onSelectVertex,
      insertvertexatmidpoint: this.onInsertVertexAtMidpoint
    })

    bindEditModeListeners(state, this.map, handlers)
    this.map.on('draw.selectionchange', handlers.selectionchange)
    this.map.on('draw.update', handlers.update)
    this.map.on(CUSTOM_DRAW_EVENTS.SELECT_VERTEX, handlers.selectvertex)
    this.map.on(CUSTOM_DRAW_EVENTS.INSERT_VERTEX_AT_MIDPOINT, handlers.insertvertexatmidpoint)
  },

  applyVertexSelection (state, options) {
    if (options.selectedVertexType === 'midpoint') {
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      state.feature.changed()
      this._ctx.store.render()
      this.updateMidpoint(state.midpoints[options.selectedVertexIndex - state.vertices.length])
      return
    }
    if (options.selectedVertexIndex === -1) {
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      state.feature.changed()
      this._ctx.store.render()
    }
  },

  onSelectionChange (state, event) {
    // Refresh vertex list so numVertices reflects the latest geometry (e.g. after midpoint insertion)
    this.syncVertices(state)

    const vertexCoord = event.points[event.points.length - 1]?.geometry.coordinates

    // For keyboard mode or when coordPath is set, trust the existing selectedVertexIndex.
    if (state.interfaceType !== 'keyboard' && vertexCoord && !state.coordPath) {
      // No coordPath available - need to search for vertex by coordinates
      const geom = event.features[0]?.geometry
      const coords = getCoords(geom)
      state.selectedVertexIndex = this.findVertexIndex(coords, vertexCoord, state.selectedVertexIndex)
    }
    // If we have coordPath, selectedVertexIndex is already correct from onTap/changeMode

    state.selectedVertexType ??= state.selectedVertexIndex >= 0 ? 'vertex' : null

    this.map.fire(CUSTOM_DRAW_EVENTS.VERTEX_SELECTION, {
      index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
      numVertices: state.vertices.length
    })

    // Use vertex from event if available, otherwise fall back to state
    const vertex = vertexCoord || (state.selectedVertexIndex >= 0 ? state.vertices[state.selectedVertexIndex] : null)
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onScaleChange (state, event) {
    state.scale = event.scale
  },

  onInterfaceTypeChange (state, event) {
    state.interfaceType = event.interfaceType
    const vertex = state.selectedVertexIndex >= 0 ? state.vertices[state.selectedVertexIndex] : null
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onUpdate (state) {
    const prev = new Set(state.vertices.map(coordinate => JSON.stringify(coordinate)))
    if (prev.size === state.vertices.length) {
      return
    }
    // Duplicate coordinates exist (e.g. a self-touching ring). Comparing the list
    // against itself cannot surface a distinct new vertex, so clear the selection.
    state.selectedVertexIndex = -1
    state.selectedVertexType ??= null
  },

  onMove (state) {
    const vertex = state.vertices[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  // Inbound signal from MaplibreDrawAdapter.nudgeSelectedVertex — bridges into the running
  // mode since the adapter has no direct reference to its live state.
  onNudgeVertex (state, event) {
    this.nudgeVertexByDelta(state, event.dx, event.dy, event.isLargeStep)
    const vertex = state.vertices[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  // Inbound signal from MaplibreDrawAdapter.selectVertex — previews a vertex/midpoint by flat
  // index (no geometry change) for the spatial listbox's roving move.
  onSelectVertex (state, event) {
    if (!state.vertices?.length) { // lazy-populate guard, same as startKeyboardSelection
      state.vertices = this.getVertices(state.featureId)
      state.midpoints = this.getMidpoints(state.featureId)
    }
    const type = event.index < state.vertices.length ? 'vertex' : 'midpoint'
    this.changeMode(state, {
      selectedVertexIndex: event.index,
      selectedVertexType: type,
      ...(type === 'vertex' && { coordPath: this.getCoordPath(state, event.index) })
    })
  },

  // Inbound signal from MaplibreDrawAdapter.insertVertexAtMidpoint — commits a new vertex at
  // midpoint `event.index` for the spatial listbox's confirm, landing exactly on the midpoint
  // (no offset), same as touchHandlers.js's onTap does for a midpoint tap.
  onInsertVertexAtMidpoint (state, event) {
    if (!state.vertices?.length) {
      state.vertices = this.getVertices(state.featureId)
      state.midpoints = this.getMidpoints(state.featureId)
    }
    this.insertVertex({ ...state, selectedVertexIndex: event.index, selectedVertexType: 'midpoint' })
  },

  onButtonClick (state, event) {
    if (event.target.closest(`#${state.deleteVertexButtonId}`) && state.selectedVertexType === 'vertex') {
      this.deleteVertex(state)
    }
    if (event.target.closest(`#${state.undoButtonId}`)) {
      this.handleUndo(state)
    }
  },

  clickNoTarget (state) {
    this.changeMode(state, { selectedVertexIndex: -1, selectedVertexType: null, isPanEnabled: true })
  },

  // Prevent selecting other features
  changeMode (state, updates) {
    if (!state.featureId) {
      return
    }
    this._ctx.api.changeMode('edit_vertex', { ...state, ...updates })
  },

  onStop (state) {
    this.map._drawEditContainer = null
    this.map._editingFeatureId = null
    const handlers = this.handlers
    this.map.off('draw.selectionchange', handlers.selectionchange)
    this.map.off('draw.update', handlers.update)
    this.map.off(CUSTOM_DRAW_EVENTS.SELECT_VERTEX, handlers.selectvertex)
    this.map.off(CUSTOM_DRAW_EVENTS.INSERT_VERTEX_AT_MIDPOINT, handlers.insertvertexatmidpoint)
    unbindEditModeListeners(state, this.map, handlers)
    this.hideTouchVertexIndicator(state)
  }
}
