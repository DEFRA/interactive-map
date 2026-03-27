export const setSublayerOpacity = ({ pluginState }, datasetId, sublayerId, opacity) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  pluginState.dispatch({ type: 'SET_SUBLAYER_OPACITY', payload: { datasetId, sublayerId, opacity } })
  pluginState.layerAdapter?.setSublayerOpacity(datasetId, sublayerId, opacity)
}
