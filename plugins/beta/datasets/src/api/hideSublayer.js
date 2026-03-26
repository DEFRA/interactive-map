export const hideSublayer = ({ pluginState }, datasetId, sublayerId) => {
  pluginState.layerAdapter?.hideSublayer(datasetId, sublayerId)
  pluginState.dispatch({ type: 'SET_SUBLAYER_VISIBILITY', payload: { datasetId, sublayerId, visibility: 'hidden' } })
}
