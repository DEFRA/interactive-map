export const showDataset = ({ pluginState }, datasetId) => {
  pluginState.layerAdapter?.showDataset(datasetId)
  pluginState.dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { id: datasetId, visibility: 'visible' } })
}
