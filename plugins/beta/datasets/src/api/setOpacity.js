export const setOpacity = ({ pluginState }, opacity, options) => {
  const { datasetId, sublayerId } = options || {}

  if (sublayerId) {
    const dataset = pluginState.datasets?.find(d => d.id === datasetId)
    if (!dataset) {
      return
    }
    pluginState.dispatch({ type: 'SET_SUBLAYER_OPACITY', payload: { datasetId, sublayerId, opacity } })
    pluginState.layerAdapter?.setSublayerOpacity(datasetId, sublayerId, opacity)
    return
  }

  if (datasetId) {
    const dataset = pluginState.datasets?.find(d => d.id === datasetId)
    if (!dataset) {
      return
    }
    pluginState.dispatch({ type: 'SET_OPACITY', payload: { datasetId, opacity } })
    pluginState.layerAdapter?.setOpacity(datasetId, opacity)
    return
  }

  // Global
  pluginState.dispatch({ type: 'SET_GLOBAL_OPACITY', payload: { opacity } })
  pluginState.datasets?.forEach(d => {
    pluginState.layerAdapter?.setOpacity(d.id, opacity)
  })
}
