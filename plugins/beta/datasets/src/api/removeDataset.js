export const removeDataset = ({ pluginState }, datasetId) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  pluginState.layerAdapter?.removeDataset(dataset, pluginState.datasets)
  pluginState.dispatch({ type: 'REMOVE_DATASET', payload: { id: datasetId } })
}
