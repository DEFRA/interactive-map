export const getSublayerStyle = ({ pluginState }, { datasetId, sublayerId }) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return null
  }
  const sublayer = dataset.sublayers?.find(s => s.id === sublayerId)
  if (!sublayer) {
    return null
  }
  return sublayer.style ?? null
}
