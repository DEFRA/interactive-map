export const removeDataset = ({ pluginState: { dispatch }, mapProvider }, datasetId) => {
  // Here we need to remove the dataset from the adapter before removing it from state,
  // otherwise the datasetDefinition will have been removed from the registry by the
  // time the adapter tries to remove the dataset, which causes an error
  mapProvider.datasets?.removeDataset(datasetId)
  dispatch({ type: 'REMOVE_DATASET', payload: { id: datasetId } })
}
