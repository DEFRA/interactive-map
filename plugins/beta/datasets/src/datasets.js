import { createDynamicSource } from './fetch/createDynamicSource.js'
// NOSONAR: applyDatasetDefaults and datasetDefaults are used in processedDatasets.map
import { applyDatasetDefaults, datasetDefaults } from './defaults.js'

const isDynamicSource = (dataset) =>
  typeof dataset.geojson === 'string' &&
  !!dataset.idProperty &&
  typeof dataset.transformRequest === 'function'

export const createDatasets = ({
  adapter,
  pluginConfig,
  pluginStateRef,
  mapStyleId,
  mapProvider,
  events,
  eventBus
}) => {
  const { datasets } = pluginConfig

  const dynamicSources = new Map()

  const getDatasets = () => pluginStateRef.current.datasets || datasets
  const getHiddenFeatures = () => pluginStateRef.current.hiddenFeatures || {}

  // Initialise all datasets via the adapter, then set up dynamic sources
  const processedDatasets = datasets.map(d => applyDatasetDefaults(d, datasetDefaults))
  adapter.init(processedDatasets, mapStyleId).then(() => {
    processedDatasets.forEach(dataset => {
      if (!isDynamicSource(dataset)) {
        return
      }

      const dynamicSource = createDynamicSource({
        dataset,
        map: mapProvider.map,
        onUpdate: (datasetId, geojson) => adapter.setData(datasetId, geojson)
      })
      dynamicSources.set(dataset.id, dynamicSource)
    })

    eventBus.emit('datasets:ready')
  })

  // Handle basemap style changes — delegate entirely to the adapter
  const onSetStyle = (e) => {
    adapter.onStyleChange(getDatasets(), e.id, getHiddenFeatures(), dynamicSources)
  }

  eventBus.on(events.MAP_SET_STYLE, onSetStyle)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, onSetStyle)

      // Clean up dynamic sources
      dynamicSources.forEach(source => source.destroy())
      dynamicSources.clear()
      adapter.destroy(getDatasets())
    },

    /**
     * Refresh a dynamic source - clears cache and re-fetches
     * @param {string} datasetId - Dataset ID to refresh
     */
    refreshDataset (datasetId) {
      dynamicSources.get(datasetId)?.refresh()
    },

    /**
     * Clear a dynamic source's cache
     * @param {string} datasetId - Dataset ID to clear
     */
    clearDatasetCache (datasetId) {
      dynamicSources.get(datasetId)?.clear()
    },

    /**
     * Get feature count for a dynamic source
     * @param {string} datasetId - Dataset ID
     * @returns {number|null} Feature count or null if not a dynamic source
     */
    getFeatureCount (datasetId) {
      return dynamicSources.get(datasetId)?.getFeatureCount() ?? null
    }
  }
}
