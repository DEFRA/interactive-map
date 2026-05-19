export const setStyle = ({ pluginState, mapState }, styleChanges, { datasetId, sublayerId } = {}) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  const mapStyle = mapState.mapStyle
  const payload = { datasetId, styleChanges, mapStyle, sublayerId }
  pluginState.dispatch({ type: 'SET_DATASET_STYLE', payload })
}
