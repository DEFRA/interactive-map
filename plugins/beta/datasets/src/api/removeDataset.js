export const removeDataset = ({ pluginState }, datasetId) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  // Here we need to remove the dataset from the adapter before removing it from state,
  // otherwise the datasetDefinition will have been removed from the registry by the
  // time the adapter tries to remove the dataset, which causes an error
  pluginState.layerAdapter?.removeDataset(datasetId, pluginState.datasets)
  pluginState.dispatch({ type: 'REMOVE_DATASET', payload: { id: datasetId } })
}
