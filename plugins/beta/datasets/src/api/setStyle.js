export const setStyle = ({ pluginState: { dispatch }, mapState }, styleChanges, { datasetId, sublayerId } = {}) => {
  datasetId = sublayerId ? `${datasetId}-${sublayerId}` : datasetId
  const mapStyle = mapState.mapStyle
  const payload = { datasetId, styleChanges, mapStyle }
  dispatch({ type: 'SET_DATASET_STYLE', payload })
}
