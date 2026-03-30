export const setFeatureVisibility = ({ pluginState }, visible, featureIds, { datasetId, idProperty = null } = {}) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  if (visible) {
    const existingHidden = pluginState.hiddenFeatures[datasetId]
    if (!existingHidden) {
      return
    }
    const remainingHiddenIds = existingHidden.ids.filter(id => !featureIds.includes(id))
    pluginState.dispatch({ type: 'SHOW_FEATURES', payload: { layerId: datasetId, featureIds } })
    pluginState.layerAdapter?.showFeatures(dataset, idProperty, remainingHiddenIds)
  } else {
    const existingHidden = pluginState.hiddenFeatures[datasetId]
    const existingIds = existingHidden?.ids || []
    const allHiddenIds = [...new Set([...existingIds, ...featureIds])]
    pluginState.dispatch({ type: 'HIDE_FEATURES', payload: { layerId: datasetId, idProperty, featureIds } })
    pluginState.layerAdapter?.hideFeatures(dataset, idProperty, allHiddenIds)
  }
}
