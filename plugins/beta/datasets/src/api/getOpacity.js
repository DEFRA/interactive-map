export const getOpacity = ({ pluginState }, datasetId) => {
  if (!datasetId) {
    return pluginState.datasets?.[0]?.opacity ?? null
  }

  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  return dataset?.opacity ?? null
}
