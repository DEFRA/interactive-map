export const setDatasetVisibility = ({ pluginState }, visible, options = {}) => {
  const { datasetId, sublayerId } = options

  if (sublayerId) {
    const visibility = visible ? 'visible' : 'hidden'
    pluginState.layerAdapter?.[visible ? 'showSublayer' : 'hideSublayer'](datasetId, sublayerId)
    pluginState.dispatch({ type: 'SET_SUBLAYER_VISIBILITY', payload: { datasetId, sublayerId, visibility } })
    return
  }

  if (datasetId) {
    pluginState.layerAdapter?.[visible ? 'showDataset' : 'hideDataset'](datasetId)
    pluginState.dispatch({ type: 'SET_DATASET_VISIBILITY', payload: { id: datasetId, visibility: visible ? 'visible' : 'hidden' } })
    if (visible) {
      const dataset = pluginState.datasets?.find(d => d.id === datasetId)
      Object.entries(dataset?.sublayerVisibility || {}).forEach(([subId, vis]) => {
        if (vis === 'hidden') {
          pluginState.layerAdapter?.hideSublayer(datasetId, subId)
        }
      })
    }
    return
  }

  // Global
  pluginState.dispatch({ type: 'SET_GLOBAL_VISIBILITY', payload: { visibility: visible ? 'visible' : 'hidden' } })
  pluginState.datasets?.forEach(dataset => {
    pluginState.layerAdapter?.[visible ? 'showDataset' : 'hideDataset'](dataset.id)
    if (visible) {
      Object.entries(dataset.sublayerVisibility || {}).forEach(([subId, vis]) => {
        if (vis === 'hidden') {
          pluginState.layerAdapter?.hideSublayer(dataset.id, subId)
        }
      })
    }
  })
}
