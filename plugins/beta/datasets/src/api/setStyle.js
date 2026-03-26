export const setStyle = ({ pluginState, mapState }, { datasetId, style }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  pluginState.dispatch({ type: 'SET_DATASET_STYLE', payload: { datasetId, styleChanges: style } })

  const updatedDataset = { ...dataset, ...style }
  pluginState.layerAdapter?.setStyle(updatedDataset, mapState.mapStyle.id)
}
