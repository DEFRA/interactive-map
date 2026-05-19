export const setStyle = ({ pluginState, mapState }, styleChanges, { datasetId, sublayerId } = {}) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }
  const mapStyle = mapState.mapStyle
  // const type = sublayerId ? 'SET_SUBLAYER_STYLE' : 'SET_DATASET_STYLE'
  const type = 'SET_DATASET_STYLE'
  const payload = { datasetId: sublayerId ? `${datasetId}-${sublayerId}` : datasetId, styleChanges, mapStyle, sublayerId }
  pluginState.dispatch({ type, payload })
}
