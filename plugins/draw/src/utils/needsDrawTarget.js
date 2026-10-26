import { isDrawingMode } from './drawModes.js'

/**
 * Returns true when the user needs the crosshair and Add point button to place a vertex.
 *
 * Shared by the crosshair (DrawInit) and the Add point button (manifest hiddenWhen) so the two
 * can't drift apart. The crosshair also shows for keyboard users, who place with Enter instead.
 *
 * - Map controls open: an explicit "I can't drag/pinch this map" signal from the user, so it
 *   counts for every interface type (a Voice Control user never registers as anything but 'mouse').
 * - Touch: always, while drawing.
 *
 * @param {{ appState: Object, pluginState: Object }} context
 * @returns {boolean}
 */
export const needsDrawTarget = ({ appState, pluginState }) =>
  isDrawingMode(pluginState.mode) &&
  (appState.interfaceType === 'touch' || !!appState.expandedButtons?.has('mapControls'))
