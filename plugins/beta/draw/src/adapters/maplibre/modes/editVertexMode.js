import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { getSnapInstance, clearSnapIndicator } from '../utils/snapHelpers.js'
import { getCoords } from './editVertexMode/geometryHelpers.js'
import { scalePoint } from './editVertexMode/helpers.js'
import { undoHandlers } from './editVertexMode/undoHandlers.js'
import { touchHandlers } from './editVertexMode/touchHandlers.js'
import { vertexOperations } from './editVertexMode/vertexOperations.js'
import { vertexQueries } from './editVertexMode/vertexQueries.js'
import { keyboardHandlers } from './editVertexMode/keyboardHandlers.js'
import { pointerHandlers } from './editVertexMode/pointerHandlers.js'

const EVENT_VERTEX_SELECTION = 'draw.vertexselection'

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

    // Clear undo stack only on initial entry to edit mode for a feature
    // Only clear if we're starting a new editing session (not already editing)
    if (this.map._lastEditFeatureId !== state.featureId) {
      this.map._undoStack?.clear()
      this.map._lastEditFeatureId = state.featureId
    }

    // Get feature type for later reference
    const feature = this.getFeature(state.featureId)
    state.featureType = feature?.type

    state.vertecies = this.getVerticies(state.featureId)
    state.midpoints = this.getMidpoints(state.featureId)
    this.setupEventListeners(state)

    this.applyVertexSelection(state, options)
    this.map._drawEditContainer = options.container
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

  setupEventListeners (state) {
    const bind = (fn) => (e) => fn.call(this, state, e)
    const h = this.handlers = {
      keydown: bind(this.onKeydown),
      keyup: bind(this.onKeyup),
      pointerdown: bind(this.onPointerevent),
      pointermove: bind(this.onPointerevent),
      pointerup: bind(this.onPointerevent),
      click: bind(this.onButtonClick),
      touchstart: bind(this.onTouchstart),
      touchmove: bind(this.onTouchmove),
      touchend: bind(this.onTouchend),
      selectionchange: bind(this.onSelectionChange),
      scalechange: bind(this.onScaleChange),
      update: bind(this.onUpdate),
      move: bind(this.onMove),
      interfacetypechange: bind(this.onInterfaceTypeChange)
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
    this.map.on('draw.interfacetypechange', h.interfacetypechange)
  },

  applyVertexSelection (state, options) {
    if (options.selectedVertexType === 'midpoint') {
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      state.feature.changed()
      this._ctx.store.render()
      this.updateMidpoint(state.midpoints[options.selectedVertexIndex - state.vertecies.length])
      return
    }
    if (options.selectedVertexIndex === -1) {
      state.selectedCoordPaths = []
      this.clearSelectedCoordinates()
      state.feature.changed()
      this._ctx.store.render()
    }
  },

  onSelectionChange (state, e) {
    // Refresh vertex list so numVertecies reflects the latest geometry (e.g. after midpoint insertion)
    this.syncVertices(state)

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

    this.map.fire(EVENT_VERTEX_SELECTION, {
      index: state.selectedVertexType === 'vertex' ? state.selectedVertexIndex : -1,
      numVertecies: state.vertecies.length
    })

    // Use vertex from event if available, otherwise fall back to state
    const vertex = vertexCoord || (state.selectedVertexIndex >= 0 ? state.vertecies[state.selectedVertexIndex] : null)
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onScaleChange (state, e) {
    state.scale = e.scale
  },

  onInterfaceTypeChange (state, e) {
    state.interfaceType = e.interfaceType
    const vertex = state.selectedVertexIndex >= 0 ? state.vertecies[state.selectedVertexIndex] : null
    this.updateTouchVertexTarget(state, vertex ? scalePoint(this.map.project(vertex), state.scale) : null)
  },

  onUpdate (state) {
    const prev = new Set(state.vertecies.map(c => JSON.stringify(c)))
    if (prev.size === state.vertecies.length) {
      return
    }
    // Duplicate coordinates exist (e.g. a self-touching ring). Comparing the list
    // against itself cannot surface a distinct new vertex, so clear the selection.
    state.selectedVertexIndex = -1
    state.selectedVertexType ??= null
  },

  onMove (state) {
    const vertex = state.vertecies[state.selectedVertexIndex]
    if (vertex) {
      this.updateTouchVertexTarget(state, scalePoint(this.map.project(vertex), state.scale))
    }
  },

  onButtonClick (state, e) {
    if (e.target.closest(`#${state.deleteVertexButtonId}`) && state.selectedVertexType === 'vertex') {
      this.deleteVertex(state)
    }
    if (e.target.closest(`#${state.undoButtonId}`)) {
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
    this.map.off('draw.interfacetypechange', h.interfacetypechange)
    this.map.dragPan.enable()
    window.removeEventListener('click', h.click)
    window.removeEventListener('keydown', h.keydown, { capture: true })
    window.removeEventListener('keyup', h.keyup, { capture: true })
    this.hideTouchVertexIndicator(state)
  }
}
