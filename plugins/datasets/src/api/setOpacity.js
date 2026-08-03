export const setOpacity = ({ pluginState: { dispatch } }, opacity, options = {}) => {
  const { datasetId, sublayerId } = options
  const fullId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  if (fullId) {
    dispatch({ type: 'SET_OPACITY', payload: { datasetId: fullId, opacity } })
  } else {
    // Global update
    dispatch({ type: 'SET_GLOBAL_OPACITY', payload: { opacity } })
  }
}
