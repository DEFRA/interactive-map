import MapboxDraw from '@mapbox/mapbox-gl-draw'
import doubleClickZoom from '../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/lib/double_click_zoom.js' // NOSONAR
import { CUSTOM_DRAW_EVENTS } from '../drawEvents.js'
import { scalePoint } from './editVertexMode/helpers.js'
import { bindEditModeListeners, unbindEditModeListeners, clearActiveSnapIndicator, buildEditModeHandlers } from '../utils/editModeEvents.js'
import { undoHandlers } from './editPointMode/undoHandlers.js'
import { touchHandlers } from './editPointMode/touchHandlers.js'
import { pointOperations } from './editPointMode/pointOperations.js'
import { keyboardHandlers } from './editPointMode/keyboardHandlers.js'
import { pointerHandlers } from './editPointMode/pointerHandlers.js'

/**
 * Relocating an already-placed single-coordinate feature. Composed the same way
 * editVertexMode.js is, but cannot inherit DirectSelect.onSetup (throws a TypeError on a
 * Point — see this file's own onSetup) or its ring-shaped toDisplayFeatures/changeMode —
 * the point has one coordinate, always selected, with no vertex list to navigate.
 */
export const EditPointMode = {
  ...MapboxDraw.modes.direct_select,
  ...undoHandlers,
  ...touchHandlers,
  ...pointOperations,
  ...keyboardHandlers,
  ...pointerHandlers,

  onSetup (options) {
    const featureId = options.featureId
    const feature = this.getFeature(featureId)

    if (!feature) {
      throw new Error('You must provide a featureId to enter edit_point mode')
    }

    const state = {
      featureId,
      feature,
      dragMoveLocation: null,
      dragMoving: false,
      canDragMove: false,
      // Empty, not [''] — this is what lets DirectSelect's own onFeature/onDrag/dragFeature
      // machinery move a Point via its stock whole-feature-delta path unmodified.
      selectedCoordPaths: []
    }

    this.setSelectedCoordinates([])
    this.setSelected(featureId)
    doubleClickZoom.disable(this)
    this.setActionableState({ trash: false })

    Object.assign(state, {
      container: options.container,
      interfaceType: options.interfaceType,
      undoButtonId: options.undoButtonId,
      isPanEnabled: options.isPanEnabled,
      getSnapEnabled: options.getSnapEnabled,
      scale: options.scale ?? 1
    })

    // Clear undo stack only on initial entry to edit mode for a feature (same convention
    // as edit_vertex, so switching Undo between features never applies a stale op).
    if (this.map._lastEditFeatureId !== state.featureId) {
      this.map._undoStack?.clear()
      this.map._lastEditFeatureId = state.featureId
    }

    this.setupEventListeners(state)
    this.map._drawEditContainer = options.container
    this.addTouchPointTarget(state)

    // edit_vertex's first interaction is always a click/tap that selects a vertex — which,
    // as a side effect, moves focus onto the map viewport, satisfying keyboardHandlers.js's
    // isInteractiveElementFocused guard (it only blocks shortcuts when focus is OUTSIDE
    // state.container). A point is already selected from the moment this mode starts, so a
    // keyboard-only session can go straight to arrow keys with no click in between — meaning
    // focus may still be sitting on whatever button opened this mode. Claim it explicitly so
    // that guard reads correctly from the first keypress, not just after an incidental click.
    state.container?.focus({ preventScroll: true })

    clearActiveSnapIndicator(this.map)

    // Show the touch target if entering on a touch interface.
    if (state.interfaceType === 'touch') {
      setTimeout(() => {
        this.updateTouchPointTarget(state, scalePoint(this.map.project(state.feature.coordinates), state.scale))
      }, 0)
    }

    // Claim the D-pad once for the whole session. Unlike edit_vertex (which re-fires this on
    // every vertex selection change), a point never emits draw.vertexchange — that event
    // unconditionally releases mapProvider.activeMoveTarget, so it must never fire here.
    // attachEvents' resetState() (events.js) is the release point, on Done/Cancel/edit-finish.
    // numVertecies (misspelled) — MaplibreDrawAdapter.js's vertexselection handler only reads
    // that exact key when normalising to the adapter contract's numVertices; firing the
    // correctly-spelled key here would get silently clobbered to undefined instead.
    this.map.fire(CUSTOM_DRAW_EVENTS.VERTEX_SELECTION, { index: 0, numVertecies: 1 })

    return state
  },

  setupEventListeners (state) {
    const handlers = this.handlers = buildEditModeHandlers(this, state, { nudge: this.onNudgePoint })
    bindEditModeListeners(state, this.map, handlers)
  },

  // active isn't cosmetic here — mapbox-gl-draw's own isActiveFeature()/isInactiveFeature()
  // selectors (used by DirectSelect.onMouseDown to route mousedown into onFeature/
  // startDragging, and by this mode's own onClick to tell "click the point" apart from
  // "click elsewhere") key off it, and Feature.prototype.internal() defaults it to 'false'.
  // Without setting it here, mousedown never starts a drag and every click — including on
  // the point itself — falls through to onClick's relocate branch. Deliberately does not
  // call createSupplementaryPoints, which would draw a plain vertex disc over the icon.
  toDisplayFeatures (state, geojson, push) {
    geojson.properties.active = state.featureId === geojson.properties.id ? 'true' : 'false'
    push(geojson)
  },

  onScaleChange (state, event) {
    state.scale = event.scale
  },

  onInterfaceTypeChange (state, event) {
    state.interfaceType = event.interfaceType
    this.updateTouchPointTarget(state, scalePoint(this.map.project(state.feature.coordinates), state.scale))
  },

  onMove (state) {
    this.updateTouchPointTarget(state, scalePoint(this.map.project(state.feature.coordinates), state.scale))
  },

  // Inbound signal from MaplibreDrawAdapter.nudgeSelectedVertex — the D-pad entry point for
  // all three interface types (see mapProvider.activeMoveTarget in events.js). Repositions
  // the touch target the same way onMove/onInterfaceTypeChange do, since nudgePointByDelta
  // has no equivalent hook of its own.
  onNudgePoint (state, event) {
    this.nudgePointByDelta(state, event.dx, event.dy, event.isLargeStep)
    this.updateTouchPointTarget(state, scalePoint(this.map.project(state.feature.coordinates), state.scale))
  },

  onButtonClick (state, event) {
    if (event.target.closest(`#${state.undoButtonId}`)) {
      this.handleUndo(state)
    }
  },

  onStop (state) {
    this.map._drawEditContainer = null
    this.map._editingFeatureId = null
    unbindEditModeListeners(state, this.map, this.handlers)
    this.hideTouchPointIndicator(state)
  }
}
