import {
  getSnapInstance, isSnapActive, isSnapEnabled, createSnappedEvent, createSnappedClickEvent
} from '../../utils/snapHelpers.js'

/**
 * Click / vertex-placement handling for the shared draw mode: mouse clicks, the
 * add-vertex button, and the draw.create re-id step. Part of createDrawMode.
 */
export const createClickHandlers = ({ ParentMode, getFeature, getCoords, validateClick, finishOnInvalidClick }) => ({
  onClick (state, e) {
    // Skip non-primary clicks, undo operations, or clicks outside canvas
    if (e.originalEvent.button > 0 || this.map._undoInProgress || e.originalEvent.target !== this.map.getCanvas()) {
      return
    }
    const snap = getSnapInstance(this.map)
    if (isSnapEnabled(state) && isSnapActive(snap)) {
      e = createSnappedEvent(e, snap)
    } else {
      const coords = getCoords(getFeature(state))
      if (coords.length > 0) {
        coords[coords.length - 1] = [e.lngLat.lng, e.lngLat.lat]
      }
      // For polygon: prevent duplicate-coordinate clicks from reaching ParentMode, which
      // would trigger a changeMode chain and cause a runtime error on coords.length access
      if (!finishOnInvalidClick && !validateClick(getFeature(state))) {
        return
      }
    }
    const coordsBefore = getCoords(getFeature(state)).length
    ParentMode.onClick.call(this, state, e)
    // Push undo and update count if a vertex was added
    if (getCoords(getFeature(state)).length > coordsBefore) {
      this.pushDrawUndo(state)
      this.dispatchVertexChange(getCoords(getFeature(state)))
    }
  },

  onTap () {

  },

  doClick (state) {
    // Skip during undo operation
    if (this.map._undoInProgress) {
      return
    }

    const feature = getFeature(state)
    const coords = getCoords(feature)
    this.dispatchVertexChange(coords)

    if (!validateClick(feature)) {
      // For lines: clicking same spot (like double-click) should finish the line.
      // isValidLineClick only returns false with 2+ coords, so coords.length is always > 1 here.
      if (finishOnInvalidClick) {
        coords.pop()
        this.map.fire('draw.create', { features: [feature.toGeoJSON()] })
        this.changeMode('simple_select', { featureIds: [feature.id] })
      }
      return
    }

    const snap = getSnapInstance(this.map)
    const snappedEvent = isSnapEnabled(state) && createSnappedClickEvent(this.map, snap)

    if (snappedEvent) {
      ParentMode.onClick.call(this, state, snappedEvent)
      this._ctx.store.render()
    } else {
      this._simulateMouse('click', ParentMode.onClick, state)
    }

    // Push undo and update count if a vertex was added. A validated click always
    // adds one vertex via the parent mode, so this runs on every successful doClick.
    const newCoords = getCoords(getFeature(state))
    this.pushDrawUndo(state)
    this.dispatchVertexChange(newCoords)
  },

  dispatchVertexChange (coords) {
    // Both polygon ring and LineString store [v0...vN, rubber_band] during drawing — subtract 1 to get placed vertex count
    this.map.fire('draw.vertexchange', {
      numVertecies: Math.max(0, coords.length - 1)
    })
  },

  onVertexButtonClick (state, e) {
    // Only trigger for the specific add vertex button, and skip during undo
    if (state.addVertexButtonId && !this.map._undoInProgress && e.target.closest(`#${state.addVertexButtonId}`)) {
      this.doClick(state)
    }
  },

  onCreate (state, e) {
    const draw = this._ctx.api
    const feature = e.features[0]
    draw.delete(feature.id)
    feature.id = state.featureId
    draw.add(feature, { userProperties: true })
  }
})
