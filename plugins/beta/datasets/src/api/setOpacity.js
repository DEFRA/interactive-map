export const setOpacity = ({ pluginState }, opacity, { datasetId, sublayerId }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  pluginState.dispatch({ type: 'SET_OPACITY', payload: { datasetId, opacity } })

  // Global
  pluginState.dispatch({ type: 'SET_GLOBAL_OPACITY', payload: { opacity } })
}
