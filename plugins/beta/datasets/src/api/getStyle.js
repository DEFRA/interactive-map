export const getStyle = ({ pluginState }, { datasetId, sublayerId } = {}) => {
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return null
  }

  if (sublayerId) {
    const sublayer = dataset.sublayers?.find(s => s.id === sublayerId)
    return sublayer?.style ?? null
  }

  return dataset.style ?? null
}
