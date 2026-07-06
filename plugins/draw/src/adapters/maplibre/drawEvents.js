/**
 * Event names used by the MapLibre draw adapter, grouped by origin.
 *
 * - MAPBOX_DRAW_EVENTS: stock events fired by @mapbox/mapbox-gl-draw itself.
 * - CUSTOM_DRAW_EVENTS: events this codebase's custom modes / adapter dispatch on the map
 *   (also under the `draw.*` namespace).
 * - STYLE_DATA_EVENT: the one native MapLibre map event the adapter listens to (to keep draw
 *   layers on top after a style reload).
 *
 * The adapter normalises all of these onto the shared, framework-agnostic event bus.
 */

// Stock @mapbox/mapbox-gl-draw events, fired by the library itself.
export const MAPBOX_DRAW_EVENTS = {
  CREATE: 'draw.create',
  UPDATE: 'draw.update',
  MODE_CHANGE: 'draw.modechange'
}

// Custom draw events dispatched by this codebase's modes / adapter.
export const CUSTOM_DRAW_EVENTS = {
  EDIT_FINISH: 'draw.editfinish',
  CANCEL: 'draw.cancel',
  VERTEX_SELECTION: 'draw.vertexselection',
  VERTEX_CHANGE: 'draw.vertexchange',
  UNDO_CHANGE: 'draw.undochange',
  UNDO: 'draw.undo',
  GEOMETRY_CHANGE: 'draw.geometrychange',
  INTERFACE_TYPE_CHANGE: 'draw.interfacetypechange'
}

// Native MapLibre map event (not a draw event) — fires whenever the map style data changes.
export const STYLE_DATA_EVENT = 'styledata'
