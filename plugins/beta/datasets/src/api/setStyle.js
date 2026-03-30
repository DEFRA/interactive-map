export const setStyle = ({ pluginState, mapState }, style, { datasetId, sublayerId } = {}) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  if (sublayerId) {
    pluginState.dispatch({ type: 'SET_SUBLAYER_STYLE', payload: { datasetId, sublayerId, styleChanges: style } })
    const updatedSublayerDataset = {
      ...dataset,
      sublayers: dataset.sublayers?.map(sublayer =>
        sublayer.id === sublayerId ? { ...sublayer, style: { ...sublayer.style, ...style } } : sublayer
      )
    }
    pluginState.layerAdapter?.setSublayerStyle(updatedSublayerDataset, sublayerId, mapState.mapStyle.id)
    return
  }

  pluginState.dispatch({ type: 'SET_DATASET_STYLE', payload: { datasetId, styleChanges: style } })
  const updatedDataset = { ...dataset, ...style }
  pluginState.layerAdapter?.setStyle(updatedDataset, mapState.mapStyle.id)
}
