import { applyExclusionFilter } from '../utils/filters.js'

export const showFeatures = ({ mapProvider, pluginState }, { featureIds, idProperty, datasetId }) => {
  const map = mapProvider.map

  // Get current hidden state before update
  const existingHidden = pluginState.hiddenFeatures[datasetId]
  if (!existingHidden) {
    return
  }

  // Get dataset to access original filter and determine layer IDs
  const dataset = pluginState.datasets?.find(d => d.id === datasetId)
  if (!dataset) {
    return
  }

  const originalFilter = dataset.filter || null
  const hasFill = !!dataset.fill
  const hasStroke = !!dataset.stroke
  const fillLayerId = hasFill ? datasetId : null

  let strokeLayerId = null
  if (hasStroke) {
    strokeLayerId = hasFill ? `${datasetId}-stroke` : datasetId
  }

  // Calculate remaining hidden IDs
  const remainingHiddenIds = existingHidden.ids.filter(id => !featureIds.includes(id))

  // Update state
  pluginState.dispatch({
    type: 'SHOW_FEATURES',
    payload: { layerId: datasetId, featureIds }
  })

  // Apply filter to both layers (or restore original if nothing hidden)
  if (fillLayerId) {
    applyExclusionFilter(map, fillLayerId, originalFilter, idProperty, remainingHiddenIds)
  }
  if (strokeLayerId) {
    applyExclusionFilter(map, strokeLayerId, originalFilter, idProperty, remainingHiddenIds)
  }
}