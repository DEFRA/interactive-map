export const setOpacity = ({ pluginState: { dispatch } }, opacity, { datasetId, sublayerId }) => {
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  dispatch({ type: 'SET_OPACITY', payload: { datasetId, opacity } })

  // Global
  dispatch({ type: 'SET_GLOBAL_OPACITY', payload: { opacity } })
}
