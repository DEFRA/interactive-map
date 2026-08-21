import DirectSelect from '../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/modes/direct_select.js' // NOSONAR
import { isActiveFeature } from '../../../../../../../node_modules/@mapbox/mapbox-gl-draw/src/lib/common_selectors.js' // NOSONAR
import {
  getSnapInstance, isSnapEnabled, getSnapLngLat, triggerSnapAtPoint, clearSnapState, setAutoSnapSuspended
} from '../../utils/snapHelpers.js'
import { validatePlacement } from '../../../../validation/validateGeometry.js'

const MODE = 'edit_point'

// A point has no ring/rubber-band to build a candidate from — just the coordinate about to
// be moved to. Mirrors drawPointMode.js's own canPlace, which mirrors validateGeometry.js's
// attemptPlacement — that helper hardcodes Polygon/LineString via MODE_BY_GEOMETRY, so a
// Point candidate is built and validated directly instead.
const canPlaceAt = (map, coord) => {
  const candidate = { type: 'Feature', geometry: { type: 'Point', coordinates: coord }, properties: {} }
  const { valid, reason } = validatePlacement(
    candidate,
    { mode: MODE, vertexIndex: 0 },
    { onGeometryChange: map._drawGeometryValidator }
  )
  if (!valid) {
    map.fire('draw.placementblocked', { feature: candidate, reason: reason ?? null, phase: 'place', mode: MODE, vertexIndex: 0 })
  }
  return valid
}

/**
 * Mouse/pointer interaction for the point-edit mode: drag (with snapping), click-elsewhere
 * to relocate, and mouse-up undo bookkeeping. Wraps the parent DirectSelect handlers — with
 * state.selectedCoordPaths built as [] (see editPointMode.js), DirectSelect's own onMouseDown
 * (== onTouchStart, left unoverridden here — only touchHandlers.js's touch stubs neutralise
 * the touch half) already routes a click on the point to onFeature/startDragging and its own
 * onDrag/dragFeature already moves it via a whole-feature delta — this only adds the
 * undo/snap/relocate behaviour stock DirectSelect has no concept of. Mixed into EditPointMode.
 */
export const pointerHandlers = {
  onFeature (state, e) {
    if (!state.dragMoving) {
      state._moveStartPosition = [...state.feature.coordinates]
      // Fixed lng/lat offset between the click and the anchor, captured once — onDrag adds it
      // to the pointer's current position on every move so a click away from the anchor keeps
      // its grab point for the whole drag.
      state._grabOffset = [state.feature.coordinates[0] - e.lngLat.lng, state.feature.coordinates[1] - e.lngLat.lat]
      // Silence the snap library's own auto-query for the drag — see setAutoSnapSuspended.
      setAutoSnapSuspended(getSnapInstance(this.map), true)
    }
    DirectSelect.onFeature.call(this, state, e)
  },

  // Click-elsewhere relocates the point — the WCAG 2.5.7 single-pointer alternative to
  // dragging. Clicking the point itself is a no-op (unlike DirectSelect.clickActiveFeature,
  // which would clear the selection — the point stays selected for the whole edit session).
  onClick (state, e) {
    if (isActiveFeature(e)) {
      return
    }
    if (!canPlaceAt(this.map, [e.lngLat.lng, e.lngLat.lat])) {
      return
    }

    const previousPosition = [...state.feature.coordinates]
    const snap = getSnapInstance(this.map)
    let target = e.lngLat
    if (isSnapEnabled(state) && snap) {
      triggerSnapAtPoint(snap, this.map, e.point)
      target = getSnapLngLat(snap) || e.lngLat
    }
    this.movePoint(state, target)
    this.pushUndo({ type: 'move_point', featureId: state.featureId, vertexIndex: 0, previousPosition })
  },

  onMouseUp (state, e) {
    const snap = getSnapInstance(this.map)
    clearSnapState(snap)
    setAutoSnapSuspended(snap, false)
    if (this._didPointMove(state)) {
      this.pushUndo({ type: 'move_point', featureId: state.featureId, vertexIndex: 0, previousPosition: state._moveStartPosition })
    }
    state._moveStartPosition = null
    DirectSelect.onMouseUp.call(this, state, e)
  },

  // Did the point actually change position during this interaction? Reads the live
  // feature coordinate directly — a Point has no ring index to look up.
  _didPointMove (state) {
    if (!state._moveStartPosition) {
      return false
    }
    const current = state.feature.coordinates
    return current[0] !== state._moveStartPosition[0] || current[1] !== state._moveStartPosition[1]
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
      // selectedCoordPaths is [] for a point (see editPointMode.js) — DirectSelect.onDrag's
      // own selectedCoordPaths.length > 0 check routes this to dragFeature, its built-in
      // whole-feature delta move, which already handles a Point feature correctly.
      DirectSelect.onDrag.call(this, state, e)
      return
    }

    if (!state.canDragMove) {
      return
    }

    state.dragMoving = true
    e.originalEvent.stopPropagation()

    // Candidate = pointer's current absolute position + the fixed grab offset — not an
    // incremental delta, which would compound onto an already-snapped position and leave the
    // pin stuck on the same target no matter how far the mouse then moves.
    const candidateLngLat = {
      lng: e.lngLat.lng + state._grabOffset[0],
      lat: e.lngLat.lat + state._grabOffset[1]
    }
    triggerSnapAtPoint(snap, this.map, this.map.project([candidateLngLat.lng, candidateLngLat.lat]))

    const finalLngLat = getSnapLngLat(snap) || candidateLngLat
    state.feature.updateCoordinate('', finalLngLat.lng, finalLngLat.lat)
    state.dragMoveLocation = e.lngLat
  },

  // Whole-feature deletion is deleteFeature()'s job, not this mode's — deleting a Point's
  // one coordinate isn't a "delete vertex" operation the way it is for a ring.
  onTrash () {}
}
