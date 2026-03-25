export const showFeatures = ({ pluginState }, { featureIds, idProperty, datasetId }) => {
  const existingHidden = pluginState.hiddenFeatures[datasetId]
  if (!existingHidden) {
    return
  }

  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  const remainingHiddenIds = existingHidden.ids.filter(id => !featureIds.includes(id))

  // Update state
  pluginState.dispatch({
    type: 'SHOW_FEATURES',
    payload: { layerId: datasetId, featureIds }
  })

  pluginState.layerAdapter?.showFeatures(dataset, idProperty, remainingHiddenIds)
}
