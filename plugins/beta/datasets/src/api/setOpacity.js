export const setOpacity = ({ pluginState: { dispatch } }, opacity, { datasetId, sublayerId }) => {
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  if (datasetId) {
    dispatch({ type: 'SET_OPACITY', payload: { datasetId, opacity } })
  } else {
    // Global update
    dispatch({ type: 'SET_GLOBAL_OPACITY', payload: { opacity } })
  }
}
