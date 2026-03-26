export const showSublayer = ({ pluginState }, datasetId, sublayerId) => {
  pluginState.layerAdapter?.showSublayer(datasetId, sublayerId)
  pluginState.dispatch({ type: 'SET_SUBLAYER_VISIBILITY', payload: { datasetId, sublayerId, visibility: 'visible' } })
}
