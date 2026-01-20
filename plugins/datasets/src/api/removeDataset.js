import { getSourceId } from '../mapLayers.js'

export const removeDataset = ({ mapProvider, pluginState }, datasetId) => {
  const map = mapProvider.map

  // Find the dataset to get its configuration
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  // Determine layer IDs based on configuration
  const sourceId = getSourceId(dataset)
  const hasFill = !!dataset.fill
  const hasStroke = !!dataset.stroke
  const fillLayerId = hasFill ? datasetId : null

  let strokeLayerId = null
  if (hasStroke) {
    strokeLayerId = hasFill ? `${datasetId}-stroke` : datasetId
  }

  // Remove layers first (must be removed before source)
  if (strokeLayerId && map.getLayer(strokeLayerId)) {
    map.removeLayer(strokeLayerId)
  }
  if (fillLayerId && map.getLayer(fillLayerId)) {
    map.removeLayer(fillLayerId)
  }

  // Only remove source if no other datasets are using it
  const otherDatasetsUsingSameSource = pluginState.datasets?.some(
    d => d.id !== datasetId && getSourceId(d) === sourceId
  )
  if (!otherDatasetsUsingSameSource && map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }

  // Update state
  pluginState.dispatch({ type: 'REMOVE_DATASET', payload: { id: datasetId } })
}