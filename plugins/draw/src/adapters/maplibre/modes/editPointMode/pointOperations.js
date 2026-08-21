import { sharedSnapMovement } from '../../utils/snapMovement.js'

// A Point has a single coordinate, always selected — no ring/segment/index bookkeeping the
// way editVertexMode's vertexOperations.js needs. getOffset/getOffsetByDelta/resolveSnapTarget
// come from the shared mixin (utils/snapMovement.js) — they're already pure single-coordinate
// math with no ring dependency; movePoint/nudgePointByDelta replace moveVertex/
// nudgeVertexByDelta with the direct Point.prototype.updateCoordinate('', lng, lat) mutation
// mapbox-gl-draw's own Point feature model already provides, instead of the toGeoJSON-mutate-
// api.add() ring round-trip.
export const pointOperations = {
  ...sharedSnapMovement,

  // The feature's own current coordinate — mapbox-gl-draw's Point model stores it flat as
  // `.coordinates`, no getCoords()/index lookup needed the way a ring feature requires.
  getPointCoord (state) {
    return this.getFeature(state.featureId)?.coordinates
  },

  getNewCoord (state, e) {
    return this.getOffset(this.getPointCoord(state), e)
  },

  // Point.prototype.updateCoordinate ignores its first (path) argument when called with
  // three arguments — mapbox-gl-draw's own Point model has nothing path-shaped to address —
  // and mutates + calls changed() in place, so unlike moveVertex there's no
  // toGeoJSON-mutate-api.add() round-trip needed for the data itself. But that round-trip's
  // api.add() call is also mapbox-gl-draw's own render trigger — updateCoordinate's changed()
  // only marks the feature dirty and fires an internal event, it never repaints (see
  // store.js's featureChanged/render). Mouse drag/click get a repaint for free regardless,
  // since mapbox-gl-draw's own dispatch (lib/mode_handler.js) auto-renders after every
  // onDrag/onClick/onMouseUp it calls — but keyboard, touch and the D-pad all move a point
  // through our own custom addEventListener-bound handlers, entirely outside that dispatch,
  // so without this explicit call the coordinate was updating with nothing on screen ever
  // reflecting it.
  movePoint (state, coord) {
    state.feature.updateCoordinate('', coord.lng, coord.lat)
    this._ctx.store.render()
    this.map.fire('draw.geometrychange', state.feature)
  },

  // Moves the point by an explicit (dx, dy) unit direction — the entry point for
  // MoveControls' D-pad (see mapProvider.activeMoveTarget in events.js). Each call is one
  // complete, undoable action (no held-key sequencing — a button click has no "held" state
  // the way arrow keys do), honouring snap via the shared resolveSnapTarget above.
  nudgePointByDelta (state, dx, dy, isLargeStep) {
    const currentCoord = this.getPointCoord(state)
    if (!currentCoord) {
      return
    }
    const previousPosition = [...currentCoord]
    const target = this.resolveSnapTarget(state, dx, dy, currentCoord, () => this.getOffsetByDelta(currentCoord, dx, dy, isLargeStep))
    this.movePoint(state, target)
    this.pushUndo({ type: 'move_point', featureId: state.featureId, vertexIndex: 0, previousPosition })
  }
}
