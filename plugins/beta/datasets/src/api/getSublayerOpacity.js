export const getSublayerOpacity = ({ pluginState }, datasetId, sublayerId) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return null
  }

  const sublayer = dataset.sublayers?.find(s => s.id === sublayerId)
  return sublayer?.style?.opacity ?? null
}
