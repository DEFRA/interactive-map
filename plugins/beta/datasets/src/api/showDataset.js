export const showDataset = ({ pluginState }, datasetId) => {
  pluginState.layerAdapter?.showDataset(datasetId)
  pluginState.dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { id: datasetId, visibility: 'visible' } })

  // Re-hide any sublayers that were individually hidden before the dataset was hidden
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (dataset?.sublayerVisibility) {
    Object.entries(dataset.sublayerVisibility).forEach(([sublayerId, visibility]) => {
      if (visibility === 'hidden') {
        pluginState.layerAdapter?.hideSublayer(datasetId, sublayerId)
      }
    })
  }
}
