/**
 * Programmatically clear all selected features and markers, and remove the location marker.
 *
 * @param {Object} params
 * @param {{ dispatch: Function }} params.pluginState
 * @param {{ markers: { remove: Function } }} params.mapState
 */
export const clear = ({ pluginState, mapState }) => {
  pluginState.dispatch({ type: 'CLEAR_SELECTED_FEATURES' })
  mapState.markers.remove('location')
}
