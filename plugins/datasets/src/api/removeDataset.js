import { getSourceId } from '../mapLayers.js'

const getLayerIds = (dataset) => {
  const hasFill = !!dataset.fill
  const hasStroke = !!dataset.stroke

  const fillLayerId = hasFill ? dataset.id : null
  let strokeLayerId = null
  if (hasStroke) {
    if (hasFill) {
      strokeLayerId = `${dataset.id}-stroke`
    } else {
      strokeLayerId = dataset.id
    }
  }

  return { fillLayerId, strokeLayerId }
}

export const removeDataset = ({ mapProvider, pluginState }, datasetId) => {
  const map = mapProvider.map

  // Find the dataset
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) return

  // Compute layer IDs
  const { fillLayerId, strokeLayerId } = getLayerIds(dataset)
  const sourceId = getSourceId(dataset)

  // Remove layers first
  const layerIdsToRemove = [strokeLayerId, fillLayerId]
  layerIdsToRemove.forEach(layerId => {
    if (layerId && map.getLayer(layerId)) {
      map.removeLayer(layerId)
    }
  })

  // Remove source if no other datasets use it
  const otherDatasetsUseSource = pluginState.datasets?.some(
    d => d.id !== datasetId && getSourceId(d) === sourceId
  )
  if (!otherDatasetsUseSource && map.getSource(sourceId)) {
    map.removeSource(sourceId)
  }

  // Update plugin state
  pluginState.dispatch({ type: 'REMOVE_DATASET', payload: { id: datasetId } })
}