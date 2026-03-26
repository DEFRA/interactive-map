export const setSublayerStyle = ({ pluginState, mapState }, { datasetId, sublayerId, style }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  pluginState.dispatch({ type: 'SET_SUBLAYER_STYLE', payload: { datasetId, sublayerId, styleChanges: style } })

  const updatedDataset = {
    ...dataset,
    sublayers: dataset.sublayers?.map(sublayer =>
      sublayer.id === sublayerId ? { ...sublayer, style: { ...sublayer.style, ...style } } : sublayer
    )
  }
  pluginState.layerAdapter?.setSublayerStyle(updatedDataset, sublayerId, mapState.mapStyle.id)
}
