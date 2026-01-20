import { applyExclusionFilter } from '../utils/filters.js'

export const hideFeatures = ({ mapProvider, pluginState }, { featureIds, idProperty, datasetId }) => {
  const map = mapProvider.map

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

  // Get current hidden state and calculate all hidden IDs
  const existingHidden = pluginState.hiddenFeatures[datasetId]
  const allHiddenIds = existingHidden
    ? [...new Set([...existingHidden.ids, ...featureIds])]
    : featureIds

  // Update state (store by datasetId, not individual layer IDs)
  pluginState.dispatch({
    type: 'HIDE_FEATURES',
    payload: { layerId: datasetId, idProperty, featureIds }
  })

  // Apply filter to both layers
  if (fillLayerId) {
    applyExclusionFilter(map, fillLayerId, originalFilter, idProperty, allHiddenIds)
  }
  if (strokeLayerId) {
    applyExclusionFilter(map, strokeLayerId, originalFilter, idProperty, allHiddenIds)
  }
}