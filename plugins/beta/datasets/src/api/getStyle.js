export const getStyle = ({ pluginState }, { datasetId }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return null
  }
  return dataset.style ?? null
}
