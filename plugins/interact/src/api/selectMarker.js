/**
 * Programmatically select a marker. Dispatches directly to the reducer so it
 * works immediately without waiting for React to re-render after `enable()`.
 *
 * @param {Object} params
 * @param {{ dispatch: Function, multiSelect: boolean }} params.pluginState
 * @param {{ markerId: string }} markerInfo
 * @param {string} markerInfo.markerId - The ID of the marker to select
 */
export const selectMarker = ({ pluginState }, { markerId }) => {
  pluginState.dispatch({
    type: 'SELECT_MARKER',
    payload: { markerId, multiSelect: pluginState.multiSelect }
  })
}
