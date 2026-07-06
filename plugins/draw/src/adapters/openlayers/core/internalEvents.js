/**
 * Manager-internal event names (these never cross the adapter boundary —
 * the shared contract lives in src/adapterEvents.js).
 */

// Fired by OLDrawManager when the resolved colour set / style instances are
// rebuilt after a map style change; modes re-style their layers in response.
export const STYLES_CHANGED_EVENT = 'styleschanged'
