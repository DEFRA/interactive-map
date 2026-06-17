import { createDynamicSource } from '../fetch/createDynamicSource.js'
// NOSONAR: applyDatasetDefaults and datasetDefaults are used in processedDatasets.map
import { applyDatasetDefaults, datasetDefaults } from './defaults.js'
import { mappedDatasetsReducer } from '../reducers/mappedDatasetsReducer.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'

export const initialiseDatasets = ({
  adapter,
  pluginConfig,
  pluginStateRef,
  mapStyle,
  mapProvider,
  events,
  dispatch,
  eventBus
}) => {
  const { datasets } = pluginConfig
  const dynamicSources = new Map()

  if (pluginConfig.globals) {
    dispatch({ type: 'SET_GLOBAL_STATE', payload: pluginConfig.globals })
  }

  // Initialise all datasets via the adapter, then set up dynamic sources
  const processedDatasets = datasets.map(d => applyDatasetDefaults(d, datasetDefaults))
  const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets })
  if (adapter.createDataset) {
    datasetRegistry.attachCreateDataset(adapter.createDataset)
  }
  datasetRegistry.attach(mappedDatasets, orderedDatasets, mapStyle)
  adapter.init(mapStyle).then(() => {
    datasetRegistry.forEachDataset(registryDataset => {
      if (!registryDataset.hasDynamicGeoJSON) {
        return
      }
      const { dynamicGeoJSON } = registryDataset
      const dynamicSource = createDynamicSource({
        dynamicGeoJSON,
        map: mapProvider.map,
        onUpdate: (datasetId, geojson) => adapter.setData(datasetId, geojson)
      })
      dynamicSources.set(registryDataset.id, dynamicSource)
    })
    // TODO - apply dynamic source defaults here, and include in mappedDatasets
    dispatch({ type: 'SET_DATASETS', payload: { datasets: processedDatasets, mappedDatasets, orderedDatasets } })
    eventBus.emit('datasets:ready')
  })

  let currentMapStyle = mapStyle

  // Handle basemap style changes — delegate entirely to the adapter
  const onSetMapStyle = (newMapStyle) => {
    currentMapStyle = newMapStyle
    adapter.onMapStyleChange(newMapStyle, dynamicSources)
  }

  const onMapSizeChange = () => {
    adapter.onMapSizeChange(currentMapStyle)
  }

  eventBus.on(events.MAP_SET_STYLE, onSetMapStyle)
  eventBus.on(events.MAP_SIZE_CHANGE, onMapSizeChange)

  return {
    remove () {
      eventBus.off(events.MAP_SET_STYLE, onSetMapStyle)
      eventBus.off(events.MAP_SIZE_CHANGE, onMapSizeChange)

      // Clean up dynamic sources
      dynamicSources.forEach(source => source.destroy())
      dynamicSources.clear()
      adapter.destroy()
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
