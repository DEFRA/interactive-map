export const setRuleStyle = ({ pluginState, mapState }, { datasetId, ruleId, style }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  pluginState.dispatch({ type: 'SET_RULE_STYLE', payload: { datasetId, ruleId, styleChanges: style } })

  const updatedDataset = {
    ...dataset,
    featureStyleRules: dataset.featureStyleRules?.map(rule =>
      rule.id === ruleId ? { ...rule, style: { ...rule.style, ...style } } : rule
    )
  }
  pluginState.layerAdapter?.setRuleStyle(updatedDataset, ruleId, mapState.mapStyle.id)
}
