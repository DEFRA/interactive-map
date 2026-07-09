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
 *   'place'         - a candidate vertex is about to be committed; a HARD_RULES
 *                     failure vetoes it outright and it never appears.
 *   'create'        - a whole new feature just finished being drawn.
 *   'edit-start'    - an existing feature was just loaded into an edit session;
 *                     nothing has changed yet, this is the baseline check.
 *   'commit-add'    - a vertex was added while drawing.
 *   'commit-move'   - a vertex was dragged/nudged while editing.
 *   'commit-insert' - a vertex was inserted at a midpoint while editing.
 *   'commit-delete' - a vertex was removed while editing.
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
 *                          a vertex placement was rejected by validatePlacement
 *                          (hard rule or user callback); feature is the candidate
 *                          geometry that was refused.
 *   VALIDITY_CHANGE        { valid, reason } — the live validity of the displayed
 *                          shape flipped while editing (drag/nudge in progress).
 *                          Drives the Done gate in edit mode, where the displayed
 *                          shape is exactly what Done finishes. Fires on flips only.
 *   CAN_PLACE_CHANGE       { canPlace, reason } — whether placing a vertex at the
 *                          crosshair would be vetoed flipped while drawing. Drives
 *                          the Add-point button. Fires on flips only.
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
