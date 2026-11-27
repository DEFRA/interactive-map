import { isSelectMarkerOnly } from './interactionModes.js'

/**
 * Returns true when the user needs the crosshair and Select button to choose a point on the map.
 *
 * Shared by the crosshair (useCrossHairVisibility) and the Select button (manifest hiddenWhen)
 * so the two can't drift apart. The crosshair adds focus-based rules on top: it also shows
 * while keyboard focus is in the map, and hides while the listbox has focus.
 *
 * - Map controls open: an explicit "I can't drag/pinch this map" signal from the user, so it
 *   counts for every interface type (a Voice Control user never registers as anything but 'mouse').
 * - Touch: unless turned off with `touchTarget: false`, or selectMarker is the only mode
 *   (markers are big enough to tap).
 *
 * @param {{ appState: Object, pluginState: Object }} context
 * @returns {boolean}
 */
export const needsTarget = ({ appState, pluginState }) =>
  !!appState.expandedButtons?.has('mapControls') ||
  (appState.interfaceType === 'touch' && pluginState.touchTarget !== false && !isSelectMarkerOnly(pluginState.interactionModes))
