export const setOpacity = ({ pluginState }, datasetIdOrOpacity, opacity) => {
  if (typeof datasetIdOrOpacity === 'number') {
    pluginState.dispatch({ type: 'SET_GLOBAL_OPACITY', payload: { opacity: datasetIdOrOpacity } })
    pluginState.datasets?.forEach(d => {
      pluginState.layerAdapter?.setOpacity(d.id, datasetIdOrOpacity)
    })
    return
  }

  const datasetId = datasetIdOrOpacity
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  pluginState.dispatch({ type: 'SET_OPACITY', payload: { datasetId, opacity } })
  pluginState.layerAdapter?.setOpacity(datasetId, opacity)
}
