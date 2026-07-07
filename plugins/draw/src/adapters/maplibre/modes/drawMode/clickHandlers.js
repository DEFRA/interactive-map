import {
  getSnapInstance, isSnapActive, isSnapEnabled, createSnappedEvent, createSnappedClickEvent
} from '../../utils/snapHelpers.js'
import { checkPlacement } from '../../../../validation/validateGeometry.js'

// The commit-level geometrychange payload for a vertex commit: the placed-only
// geometry (trailing rubber-band point dropped so validation tests the committed shape).
const placedDrawGeometryChange = (feature, getCoords, kind) => {
  const placed = getCoords(feature).slice(0, -1)
  const type = feature.toGeoJSON().geometry.type
  const geometry = type === 'Polygon'
    ? { type: 'Polygon', coordinates: [placed] }
    : { type: 'LineString', coordinates: placed }
  return { feature: { type: 'Feature', geometry, properties: {} }, kind, vertexIndex: Math.max(0, placed.length - 1) }
}

// Fire a commit-level geometrychange for validation, deferred a tick so it runs after
// the current click settles.
const scheduleDrawValidation = (map, getFeature, getCoords, state, kind) => {
  setTimeout(() => {
    const feature = getFeature(state)
    if (!feature) { return }
    map.fire('draw.geometrychange', placedDrawGeometryChange(feature, getCoords, kind))
  }, 0)
}

// Re-id a freshly created feature to the caller's requested id.
const reidCreatedFeature = (api, feature, featureId) => {
  api.delete(feature.id)
  feature.id = featureId
  api.add(feature, { userProperties: true })
}

// Guards, notifications, and small wiring handlers shared by the click paths.
const createClickHelpers = ({ geometryType, getFeature, getCoords }) => ({
  // Non-drawing clicks: secondary buttons, clicks during an undo, or off-canvas.
  _isIgnorableClick (e) {
    return e.originalEvent.button > 0 || this.map._undoInProgress || e.originalEvent.target !== this.map.getCanvas()
  },

  // Gate a would-be placement through the shared checkPlacement gate (hard rules +
  // user callback). On a veto the vertex never appears and a draw.placementblocked
  // event carries the reason. The trailing rubber-band coord is dropped so the
  // candidate is placed vertices + the point about to be placed.
  _canPlaceVertex (state, point) {
    const feature = getFeature(state)
    if (!feature || !point) { return true }
    const result = checkPlacement({
      placed: getCoords(feature).slice(0, -1),
      point,
      geometryType,
      onGeometryChange: this.map._drawGeometryValidator
    })
    if (!result.valid) {
      this.map.fire('draw.placementblocked', result.blocked)
    }
    return result.valid
  },

  dispatchVertexChange (coords) {
    // Both polygon ring and LineString store [v0...vN, rubber_band] during drawing — subtract 1 to get placed vertex count
    this.map.fire('draw.vertexchange', {
      numVertecies: Math.max(0, coords.length - 1)
    })
  },

  // Emit a commit-level geometrychange after a vertex commit (placement or undo)
  // so the validation layer can gate the Done button.
  emitDrawValidation (state, kind = 'add') {
    scheduleDrawValidation(this.map, getFeature, getCoords, state, kind)
  },

  onTap () {

  },

  onVertexButtonClick (state, e) {
    // Only trigger for the specific add vertex button, and skip during undo
    if (state.addVertexButtonId && !this.map._undoInProgress && e.target.closest(`#${state.addVertexButtonId}`)) {
      this.doClick(state)
    }
  },

  onCreate (state, e) {
    reidCreatedFeature(this._ctx.api, e.features[0], state.featureId)
  }
})

// The click paths themselves: mouse clicks and the simulated crosshair click
// (touch / keyboard / add-vertex button).
const createClickActions = ({ ParentMode, getFeature, getCoords, validateClick, finishOnInvalidClick }) => ({
  onClick (state, e) {
    // Skip non-primary clicks, undo operations, or clicks outside canvas
    if (this._isIgnorableClick(e)) {
      return
    }
    // Block a finish/close gesture (clicking a placed vertex) while the shape is invalid.
    if (this.map._drawGeometryValid === false && e.featureTarget?.properties?.meta === 'vertex') {
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
    // Hard gate: a placement the rules or the user callback veto never appears, so
    // an unrecoverable state (e.g. a self-crossing path) can't be drawn forward.
    if (!this._canPlaceVertex(state, [e.lngLat.lng, e.lngLat.lat])) {
      return
    }
    const coordsBefore = getCoords(getFeature(state)).length
    ParentMode.onClick.call(this, state, e)
    // Push undo and update count if a vertex was added
    if (getCoords(getFeature(state)).length > coordsBefore) {
      this.pushDrawUndo(state)
      this.dispatchVertexChange(getCoords(getFeature(state)))
      this.emitDrawValidation(state)
    }
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
      // For lines: clicking same spot (like double-click) should finish the line — but
      // only when the geometry is valid, so an invalid line can't be completed.
      // isValidLineClick only returns false with 2+ coords, so coords.length is always > 1 here.
      if (finishOnInvalidClick && this.map._drawGeometryValid !== false) {
        coords.pop()
        this.map.fire('draw.create', { features: [feature.toGeoJSON()] })
        this.changeMode('simple_select', { featureIds: [feature.id] })
      }
      return
    }

    const snap = getSnapInstance(this.map)
    const snappedEvent = isSnapEnabled(state) && createSnappedClickEvent(this.map, snap)

    // Hard-gate parity with onClick: touch/keyboard/add-button placements are vetoed
    // at the point that would actually be committed (snapped or map centre).
    const target = snappedEvent ? snappedEvent.lngLat : this.map.getCenter()
    if (!this._canPlaceVertex(state, [target.lng, target.lat])) {
      return
    }

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
    this.emitDrawValidation(state)
  }
})

/**
 * Click / vertex-placement handling for the shared draw mode: mouse clicks, the
 * add-vertex button, and the draw.create re-id step. Part of createDrawMode.
 */
export const createClickHandlers = (deps) => ({
  ...createClickHelpers(deps),
  ...createClickActions(deps)
})
