export const hideDataset = ({ pluginState }, datasetId) => {
  pluginState.layerAdapter?.hideDataset(datasetId)
  pluginState.dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { id: datasetId, visibility: 'hidden' } })
}
