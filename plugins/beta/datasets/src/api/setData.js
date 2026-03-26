export const setData = ({ pluginState, services }, { datasetId, geojson }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (dataset?.tiles) {
    services.logger.warn(`setData called on vector tile dataset "${datasetId}" — has no effect`)
    return
  }
  pluginState.layerAdapter?.setData(datasetId, geojson)
}
