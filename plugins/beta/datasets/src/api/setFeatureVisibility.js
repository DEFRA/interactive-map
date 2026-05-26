export const setFeatureVisibility = ({ pluginState }, visible, featureIds, { datasetId } = {}) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }
  const type = visible ? 'SHOW_FEATURES' : 'HIDE_FEATURES'
  pluginState.dispatch({ type, payload: { datasetId, featureIds } })
}
