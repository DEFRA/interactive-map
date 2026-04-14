/**
 * Programmatically unselect a marker. Dispatches directly to the reducer so it
 * works immediately without waiting for React to re-render after `enable()`.
 *
 * @param {Object} params
 * @param {{ dispatch: Function }} params.pluginState
 * @param {string} markerId - The ID of the marker to unselect
 */
export const unselectMarker = ({ pluginState }, markerId) => {
  pluginState.dispatch({
    type: 'UNSELECT_MARKER',
    payload: { markerId }
  })
}
