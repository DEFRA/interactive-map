import { handleSetMapStyle } from './handleSetMapStyle.js'
import { addMapLayers, getSourceId, getLayersUsingSource, isDynamicSource, updateSourceData } from './mapLayers.js'
import { createDynamicSource } from './fetch/createDynamicSource.js'

export const createDatasets = ({
  pluginConfig,
  pluginStateRef,
  mapStyleId,
  mapProvider,
  events,
  eventBus
}) => {
  const { map } = mapProvider
  const { datasets } = pluginConfig

  // Track dynamic sources for cleanup
  const dynamicSources = new Map()

  const getDatasets = () => pluginStateRef.current.datasets || datasets
  const getHiddenFeatures = () => pluginStateRef.current.hiddenFeatures || {}

  // Initialize all datasets once
  datasets.forEach(dataset => {
    addMapLayers(map, mapStyleId, dataset)

    // Initialize dynamic source if applicable
    if (isDynamicSource(dataset)) {
      const sourceId = getSourceId(dataset)
      const dynamicSource = createDynamicSource({
        dataset,
        map,
        sourceId,
        onUpdate: (id, geojson) => updateSourceData(map, id, geojson)
      })
      dynamicSources.set(dataset.id, dynamicSource)
    }
  })

  // Emit ready event once map has processed the layers
  map.once('idle', () => {
    eventBus.emit('datasets:ready')
  })

  // Handle style changes
  const styleHandler = handleSetMapStyle({
    map,
    events,
    eventBus,
    getDatasets,
    getHiddenFeatures,
    getDynamicSources: () => dynamicSources
  })

  return {
    remove() {
      eventBus.off(events.MAP_SET_STYLE, styleHandler)

      // Clean up dynamic sources
      dynamicSources.forEach(source => source.destroy())
      dynamicSources.clear()

      const allDatasets = getDatasets()
      const removedSourceIds = new Set()

      // Remove layers and sources
      allDatasets.forEach(dataset => {
        const sourceId = getSourceId(dataset)
        const layers = getLayersUsingSource(map, sourceId)

        // Remove all layers using this source
        layers.forEach(id => map.removeLayer(id))

        // Remove the source once
        if (!removedSourceIds.has(sourceId) && map.getSource(sourceId)) {
          map.removeSource(sourceId)
          removedSourceIds.add(sourceId)
        }
      })
    },

    /**
     * Refresh a dynamic source - clears cache and re-fetches
     * @param {string} datasetId - Dataset ID to refresh
     */
    refreshDataset(datasetId) {
      const dynamicSource = dynamicSources.get(datasetId)
      if (dynamicSource) {
        dynamicSource.refresh()
      }
    },

    /**
     * Clear a dynamic source's cache
     * @param {string} datasetId - Dataset ID to clear
     */
    clearDatasetCache(datasetId) {
      const dynamicSource = dynamicSources.get(datasetId)
      if (dynamicSource) {
        dynamicSource.clear()
      }
    },

    /**
     * Get feature count for a dynamic source
     * @param {string} datasetId - Dataset ID
     * @returns {number|null} Feature count or null if not a dynamic source
     */
    getFeatureCount(datasetId) {
      const dynamicSource = dynamicSources.get(datasetId)
      return dynamicSource ? dynamicSource.getFeatureCount() : null
    }
  }
}
