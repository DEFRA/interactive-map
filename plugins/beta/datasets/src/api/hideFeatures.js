export const hideFeatures = ({ pluginState }, { featureIds, idProperty, datasetId }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) return

  const existingHidden = pluginState.hiddenFeatures[datasetId]
  const allHiddenIds = existingHidden
    ? [...new Set([...existingHidden.ids, ...featureIds])]
    : featureIds

  pluginState.dispatch({ type: 'HIDE_FEATURES', payload: { layerId: datasetId, idProperty, featureIds } })
  pluginState.layerAdapter?.hideFeatures(dataset, idProperty, allHiddenIds)
}
