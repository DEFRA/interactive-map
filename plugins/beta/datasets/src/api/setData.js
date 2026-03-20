export const setData = ({ pluginState }, { datasetId, geojson }) => {
  // TODO: dispatch state update if dataset data needs to be tracked in state
  pluginState.layerAdapter?.setData(datasetId, geojson)
}
