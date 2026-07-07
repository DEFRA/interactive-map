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
 *                              feature itself (has `coordinates`, no `kind`).
 *                            - Commit-level validation: `{ feature, kind, vertexIndex }`
 *                              where kind ∈ 'add' | 'move' | 'insert' | 'delete'.
 *                              events.js validates these and reverts invalid ones.
 *                          Listeners must guard for the shape they expect.
 *   INTERFACE_TYPE_CHANGE  { interfaceType: 'mouse' | 'touch' | 'keyboard' }
 *   PLACEMENT_BLOCKED      { feature, reason, kind: 'place', mode, vertexIndex } —
 *                          a vertex placement was rejected by validatePlacement
 *                          (hard rule or user callback); feature is the candidate
 *                          geometry that was refused.
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
  PLACEMENT_BLOCKED: 'placementblocked'
}
