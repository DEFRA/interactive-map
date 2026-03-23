export const setStyle = ({ pluginState, mapState }, { datasetId, ...styleChanges }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) return

  // TODO: dispatch state update for style changes
  pluginState.layerAdapter?.setStyle(dataset, mapState.mapStyle.id, styleChanges)
}
