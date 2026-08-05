/**
 * What stage of the draw/edit lifecycle a geometry validation call is running at.
 * Passed as `context.phase` through validateGeometry (validation/validateGeometry.js)
 * to the default rules (validation/rules.js) and the user's `onGeometryChange` callback.
 *
 * @typedef {'preview' | 'place' | 'create' | 'edit-start' |
 *   'commit-add' | 'commit-move' | 'commit-insert' | 'commit-delete'} GeometryChangePhase
 *
 *   'preview'       - live, in-progress feedback (drag / rubber-band); nothing
 *                     has committed yet, and nothing can be vetoed at this stage.
 *                     While drawing, this single check also drives the
 *                     Add-point button (see liveDrawChecks.js) — it isn't only
 *                     a display concern, just never a commit/veto one.
 *   'place'         - a candidate vertex is genuinely about to be committed
 *                     (a real click/tap/Add-point press), evaluated once,
 *                     synchronously; a HARD_RULES failure vetoes it outright
 *                     and it never appears. Never fires continuously — that's
 *                     'preview''s job (see above).
 *   'create'        - a whole new feature just finished being drawn.
 *   'edit-start'    - an existing feature was just loaded into an edit session;
 *                     nothing has changed yet, this is the baseline check.
 *   'commit-add'    - a vertex was added while drawing.
 *   'commit-move'   - a vertex was dragged/nudged while editing.
 *   'commit-insert' - a vertex was inserted at a midpoint while editing.
 *   'commit-delete' - a vertex was removed while editing.
 */

/**
 * The single event object passed to a user's `onGeometryChange` callback
 * (validateGeometry.js) — `onGeometryChange({ feature, ...context })`. Not every
 * field is present on every phase; see each field's own doc below.
 *
 * While drawing, every rubber-band mouse-move invokes this callback ONCE,
 * throttled to one call per animation frame, always with `phase: 'preview'` —
 * even before any vertex is committed, since a location-based rule can be
 * meaningful against a single candidate point. Its verdict is combined
 * (internally, in liveDrawChecks.js) with two independently-floored built-in
 * checks to drive BOTH the dashed stroke / Done gate AND the Add-point button —
 * you don't need to do anything to support both; they share this one call. A
 * separate, genuinely momentary call with `phase: 'place'` (see
 * GeometryChangePhase) fires only for a real placement attempt, evaluated
 * synchronously, never continuously. Earlier versions of this plugin called
 * the callback twice per mouse-move (once per phase, for the same instant) —
 * that's been unified into the single 'preview' call described here.
 *
 * @typedef {object} GeometryChangeEvent
 * @property {object} feature - GeoJSON feature representing the shape at this
 *   point. Always present. During 'preview' this is the in-progress feature
 *   (placed vertices + rubber-band cursor); at every other phase it's the
 *   committed/candidate feature for that specific change.
 * @property {GeometryChangePhase} phase - what stage of the draw/edit lifecycle
 *   this is. Always present.
 * @property {'draw_polygon' | 'draw_line' | 'edit_vertex'} mode - the active draw
 *   mode. Always present.
 * @property {number} [vertexIndex] - index of the vertex being placed, added,
 *   moved, inserted, or deleted. Present on 'place' and every 'commit-*' phase;
 *   absent on 'preview', 'create', and 'edit-start' (those have no single vertex
 *   to point at).
 * @property {number} [numVertices] - count of already-committed vertices,
 *   excluding any in-progress rubber-band cursor point. Present on every
 *   'preview' call, with no minimum — including 0, against the very first
 *   candidate point, before any vertex is committed. Note this is a lower bar
 *   than the built-in live rules, which stay skipped until the geometry type's
 *   minimum vertex count is reached (self-intersection/area are meaningless
 *   below that).
 */

/**
 * Shared adapter event contract.
 *
 * Both draw adapters (MaplibreDrawAdapter, OLDrawAdapter) expose an on/off bus
 * that emits these events. events.js and the api entry points consume them, so
 * the names and payload shapes below are the contract between the adapters and
 * the framework-agnostic plugin layer.
 *
 * Engine-specific event names stay with their adapter — e.g. the map-level
 * `draw.*` events mapbox-gl-draw fires live in adapters/maplibre/drawEvents.js,
 * and the MapLibre adapter normalises them onto this contract.
 *
 * Payloads:
 *   CREATE                 GeoJSON feature that was drawn
 *   EDIT_FINISH            GeoJSON feature after editing
 *   CANCEL                 (none)
 *   VERTEX_SELECTION       { index, numVertices }
 *   VERTEX_CHANGE          { numVertices }
 *   UNDO_CHANGE            number — current undo stack length
 *   UPDATE                 GeoJSON feature after a vertex operation
 *   GEOMETRY_CHANGE        Two payload shapes share this event:
 *                            - Preview (draw/split live update): the in-progress
 *                              feature itself (has `coordinates`, no `phase`).
 *                            - Commit-level validation: `{ feature, phase, vertexIndex }`
 *                              where phase ∈ 'commit-add' | 'commit-move' |
 *                              'commit-insert' | 'commit-delete' (see GeometryChangePhase).
 *                              events.js validates these and reverts invalid ones.
 *                          Listeners must guard for the shape they expect.
 *   INTERFACE_TYPE_CHANGE  { interfaceType: 'mouse' | 'touch' | 'keyboard' }
 *   PLACEMENT_BLOCKED      { feature, reason, phase: 'place', mode, vertexIndex } —
 *                          a REAL placement attempt (click/tap/Add-point press)
 *                          was rejected by validatePlacement (hard rule or user
 *                          callback), evaluated once, synchronously; feature is
 *                          the candidate geometry that was refused. Distinct from
 *                          CAN_PLACE_CHANGE below, which is a continuous forecast
 *                          of this same outcome, not an attempt.
 *   VALIDITY_CHANGE        { valid, reason } — the live validity of the displayed
 *                          shape flipped while editing (drag/nudge in progress).
 *                          Drives the Done gate in edit mode, where the displayed
 *                          shape is exactly what Done finishes. Fires on flips only.
 *   CAN_PLACE_CHANGE       { canPlace, reason } — whether placing a vertex at the
 *                          crosshair would be vetoed flipped while drawing. Drives
 *                          the Add-point button. Derived from the same 'preview'
 *                          check that drives the dashed stroke (liveDrawChecks.js),
 *                          not a separate attempt — fires on flips only.
 */
export const ADAPTER_EVENTS = {
  CREATE: 'create',
  EDIT_FINISH: 'editfinish',
  CANCEL: 'cancel',
  VERTEX_SELECTION: 'vertexselection',
  VERTEX_CHANGE: 'vertexchange',
  UNDO_CHANGE: 'undochange',
  UPDATE: 'update',
  GEOMETRY_CHANGE: 'geometrychange',
  INTERFACE_TYPE_CHANGE: 'interfacetypechange',
  PLACEMENT_BLOCKED: 'placementblocked',
  VALIDITY_CHANGE: 'validitychange',
  CAN_PLACE_CHANGE: 'canplacechange'
}
