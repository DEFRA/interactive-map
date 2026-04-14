/**
 * Programmatically unselect a marker. Dispatches directly to the reducer so it
 * works immediately without waiting for React to re-render after `enable()`.
 *
 * @param {Object} params
 * @param {{ dispatch: Function }} params.pluginState
 * @param {{ markerId: string }} markerInfo
 * @param {string} markerInfo.markerId - The ID of the marker to unselect
 */
export const unselectMarker = ({ pluginState }, { markerId }) => {
  pluginState.dispatch({
    type: 'UNSELECT_MARKER',
    payload: { markerId }
  })
}
