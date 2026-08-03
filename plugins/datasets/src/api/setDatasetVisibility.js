export const setDatasetVisibility = ({ pluginState: { dispatch } }, visible, ids = {}) => {
  const { datasetId: datasetToUpdate, sublayerId } = ids
  const datasetId = sublayerId ? `${datasetToUpdate}-${sublayerId}` : datasetToUpdate

  if (datasetId) {
    dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { datasetId, visible } })
    return
  }

  // Global
  dispatch({ type: 'SET_GLOBAL_VISIBILITY', payload: { visible } })
}
