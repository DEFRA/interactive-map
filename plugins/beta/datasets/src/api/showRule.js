export const showRule = ({ pluginState }, datasetId, ruleId) => {
  pluginState.layerAdapter?.showRule(datasetId, ruleId)
  pluginState.dispatch({ type: 'SET_RULE_VISIBILITY', payload: { datasetId, ruleId, visibility: 'visible' } })
}
