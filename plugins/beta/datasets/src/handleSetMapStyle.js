import { addMapLayers } from './mapLayers.js'
import { applyExclusionFilter } from './utils/filters.js'
import { registerPatternImages } from './fillPatterns.js'

export const handleSetMapStyle = ({
  map,
  events,
  eventBus,
  getDatasets,
  getHiddenFeatures,
  getDynamicSources
}) => {
  const onSetStyle = (e) => {
    map.once('idle', async () => {
      const newStyleId = e.id
      const datasets = getDatasets()
      const hiddenFeatures = getHiddenFeatures()
      const dynamicSources = getDynamicSources ? getDynamicSources() : new Map()

      // Re-register pattern images (wiped on style change) before re-adding layers
      await registerPatternImages(map, datasets, newStyleId)

      // Re-add all layers with correct colors for new style
      datasets.forEach(dataset => {
        addMapLayers(map, newStyleId, dataset)
      })

      // Reapply cached data for dynamic sources
      dynamicSources.forEach(source => {
        source.reapply()
      })

      // Reapply hidden features filters
      Object.entries(hiddenFeatures).forEach(([datasetId, { idProperty, ids }]) => {
        const dataset = datasets.find(d => d.id === datasetId)
        if (!dataset) {
          return
        }

        const originalFilter = dataset.filter || null
        const hasFill = !!dataset.fill
        const hasStroke = !!dataset.stroke
        const fillLayerId = hasFill ? datasetId : null
        const strokeLayerId = hasStroke ? (hasFill ? `${datasetId}-stroke` : datasetId) : null

        if (fillLayerId) {
          applyExclusionFilter(map, fillLayerId, originalFilter, idProperty, ids)
        }
        if (strokeLayerId) {
          applyExclusionFilter(map, strokeLayerId, originalFilter, idProperty, ids)
        }
      })
    })
  }

  eventBus.on(events.MAP_SET_STYLE, onSetStyle)
  return onSetStyle
}