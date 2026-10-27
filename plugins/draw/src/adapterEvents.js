/**
 * What stage of the draw/edit lifecycle a geometry check is running at. Passed as
 * `context.phase` through validateGeometry (validation/validateGeometry.js) to the
 * default rules (validation/rules.js) and to the user's callbacks:
 *   - 'preview' and 'place' go to `onGeometryPreview`, which must answer synchronously
 *   - every other phase goes to `onGeometryChange`, which may return a Promise
 *
 * @typedef {'preview' | 'place' | 'change' | 'create' | 'edit-start' | 'recheck'} GeometryChangePhase
 *
 *   'preview'        - live, in-progress feedback (drag / rubber-band); nothing
 *                      has committed yet, and nothing can be vetoed at this stage.
 *                      While drawing, this single check also drives the
 *                      Add-point button (see liveDrawChecks.js); while editing,
 *                      it also gates Done.
 *   'place'          - a candidate vertex is genuinely about to be committed
 *                      (a real click/tap/Add-point press), evaluated once,
 *                      synchronously; a PLACE_RULES failure vetoes it outright
 *                      and it never appears. Never fires continuously — that's
 *                      'preview''s job (see above).
 *   'create'         - a whole new feature finished without a passing or pending
 *                      result for its final geometry (e.g. a new point), or its
 *                      last result asked for recheckOnFinish, so it's checked now.
 *   'edit-start'     - an existing feature was just loaded into an edit session;
 *                      nothing has changed yet, this is the baseline check.
 *   'recheck'        - the unchanged shape is checked again (recheckGeometry), with
 *                      any detail it was given as `event.detail`.
 *   'change'         - the shape changed: a vertex was added, moved, inserted or
 *                      removed, the whole shape was replaced (setGeometry), or a
 *                      change was undone.
 */

// The phase every committed change reports (see GeometryChangePhase)
export const CHANGE_PHASE = 'change'

/**
 * The event object passed to a user's `onGeometryPreview` or `onGeometryChange`
 * callback — `callback({ feature, ...context })`. Not every field is present on every
 * phase; see each field's own doc below.
 *
 * While drawing, every rubber-band mouse-move invokes `onGeometryPreview` ONCE,
 * throttled to one call per animation frame, always with `phase: 'preview'` —
 * even before any vertex is committed, since a location-based rule can be
 * meaningful against a single candidate point. Its verdict is combined
 * (internally, in liveDrawChecks.js) with two independently-floored built-in
 * checks to drive BOTH the dashed stroke AND the Add-point button. A separate,
 * genuinely momentary call with `phase: 'place'` (see GeometryChangePhase) fires
 * only for a real placement attempt, evaluated synchronously, never continuously.
 *
 * @typedef {object} GeometryChangeEvent
 * @property {object} feature - GeoJSON feature representing the shape at this
 *   point. Always present. During 'preview' this is the in-progress feature
 *   (placed vertices + rubber-band cursor); at every other phase it's the
 *   committed/candidate feature for that specific change.
 * @property {GeometryChangePhase} phase - what stage of the draw/edit lifecycle
 *   this is. Always present.
 * @property {'draw_polygon' | 'draw_line' | 'draw_point' | 'edit_vertex' | 'edit_point'} mode -
 *   the active draw mode. Always present.
 * @property {number} [vertexIndex] - index of the vertex being placed, added,
 *   moved, inserted, or deleted. Present on 'place' and on a 'change' to a single
 *   vertex; absent on 'preview', 'create', 'edit-start', 'recheck' and a
 *   setGeometry 'change' (those have no single vertex to point at).
 * @property {number} [numVertices] - count of already-committed vertices,
 *   excluding any in-progress rubber-band cursor point. Present on every
 *   'preview' call, with no minimum — including 0, against the very first
 *   candidate point, before any vertex is committed. Note this is a lower bar
 *   than the built-in preview rules, which stay skipped until the geometry type's
 *   minimum vertex count is reached (self-intersection/area are meaningless
 *   below that).
 * @property {*} [detail] - the value passed to recheckGeometry(detail). Present on
 *   'recheck' only, when one was given.
 */

/**
 * What a user's `onGeometryPreview` or `onGeometryChange` callback returns, after
 * normaliseResult (validation/validateGeometry.js). `true`/`undefined` and `false`
 * are shorthands for valid and invalid.
 *
 * @typedef {object} GeometryCheckResult
 * @property {boolean} valid
 * @property {string} [reason] - shown as a hint toast and sent with draw:geometryinvalid
 * @property {string} [announcement] - announced to screen readers in place of draw's own
 *   message; the reason then isn't shown as a hint, as the consumer presents it
 * @property {boolean} [recheckOnFinish] - `onGeometryChange` only: don't reuse this
 *   result when the shape is finished, check it again with phase 'create'
 */

/**
 * The second argument passed to a user's `onGeometryChange` callback —
 * `onGeometryChange(event, { signal, revision })` (validation/commitChecks.js).
 *
 * @typedef {object} GeometryCheckContext
 * @property {AbortSignal} signal - aborted when a newer change is checked or the
 *   session ends; a result for an aborted check is ignored.
 * @property {number} revision - increases with every check.
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
 *                              where phase is 'change' (CHANGE_PHASE, see
 *                              GeometryChangePhase). events.js checks these
 *                              (validation/commitChecks.js) to gate Done; it never
 *                              reverts them.
 *                          Listeners must guard for the shape they expect.
 *   INTERFACE_TYPE_CHANGE  { interfaceType: 'mouse' | 'touch' | 'keyboard' }
 *   PLACEMENT_BLOCKED      { feature, reason, source, announcement?, phase: 'place', mode, vertexIndex } —
 *                          built by validateGeometry.js's toPlacementBlocked; source is
 *                          'rules' or 'callback'.
 *                          a REAL placement attempt (click/tap/Add-point press)
 *                          was rejected by validatePlacement (placement rule or user
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
