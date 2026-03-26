export const hideRule = ({ pluginState }, datasetId, ruleId) => {
  pluginState.layerAdapter?.hideRule(datasetId, ruleId)
  pluginState.dispatch({ type: 'SET_RULE_VISIBILITY', payload: { datasetId, ruleId, visibility: 'hidden' } })
}
