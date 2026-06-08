export const setFeatureVisibility = ({ pluginState: { dispatch } }, visible, featureIds, { datasetId } = {}) => {
  const type = visible ? 'SHOW_FEATURES' : 'HIDE_FEATURES'
  dispatch({ type, payload: { datasetId, featureIds } })
}
