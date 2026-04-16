/**
 * Returns true when selectMarker is the only active interaction mode.
 *
 * Used to suppress the crosshair and Select action button for touch users —
 * markers have a sufficient tap target so neither is needed. Any other mode
 * combination (e.g. placeMarker, selectFeature) requires the crosshair for touch.
 *
 * @param {string[] | null} interactionModes
 * @returns {boolean}
 */
export const isSelectMarkerOnly = (interactionModes) =>
  interactionModes?.length === 1 && interactionModes.includes('selectMarker')
