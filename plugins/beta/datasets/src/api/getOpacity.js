export const getOpacity = ({ pluginState }, options) => {
  const { datasetId, sublayerId } = options || {}

  if (sublayerId) {
    const dataset = pluginState.datasets?.find(d => d.id === datasetId)
    const sublayer = dataset?.sublayers?.find(s => s.id === sublayerId)
    return sublayer?.style?.opacity ?? null
  }

  if (datasetId) {
    const dataset = pluginState.datasets?.find(d => d.id === datasetId)
    return dataset?.opacity ?? null
  }

  // Global — return first dataset's opacity
  return pluginState.datasets?.[0]?.opacity ?? null
}
