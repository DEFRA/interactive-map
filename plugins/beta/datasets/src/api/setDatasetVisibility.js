export const setDatasetVisibility = ({ pluginState }, visible, { datasetId, sublayerId }) => {
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId

  if (datasetId) {
    pluginState.dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { datasetId, visible } })
    return
  }

  // Global
  pluginState.dispatch({ type: 'SET_GLOBAL_VISIBILITY', payload: { visible } })
}
