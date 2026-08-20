import { createDynamicSource } from '../fetch/createDynamicSource.js'
// NOSONAR: applyDatasetDefaults and datasetDefaults are used in processedDatasets.map
import { applyDatasetDefaults, datasetDefaults } from './defaults.js'
import { mappedDatasetsReducer } from '../reducers/mappedDatasetsReducer.js'
import { datasetRegistry } from '../registry/datasetRegistry.js'
import { isVisibleWhen, setMenuState } from '../registry/isVisibleWhen.js'
import { buildMenuState } from '../reducers/menuStateReducer.js'
import { datasetsToMenu } from '../reducers/datasetsToMenu.js'

export const initialiseDatasets = ({
  adapter,
  pluginConfig,
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
  const menu = pluginConfig.menu || datasetsToMenu({ datasets: processedDatasets })
  setMenuState(buildMenuState(menu)) // Must be called before adapter.init so that menuState is set before any datasets are checked for visibility
  dispatch({ type: 'SET_MENU', payload: { menu } })
  dispatch({ type: 'SET_DATASETS', payload: { mappedDatasets, orderedDatasets } })

  adapter.init().then(() => {
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
    adapter.attachDynamicSources(dynamicSources)
    eventBus.emit('datasets:ready')
  })

  const onMapSizeChange = () => {
    adapter.onMapSizeChange()
  }

  eventBus.on(events.MAP_SIZE_CHANGE, onMapSizeChange)

  // Add a listener for the datasets:registry event, which will be emitted
  // whenever requested by other plugins, e.g. the menu and the mapKey plugin,
  // so they can access the dataset registry.
  const removeRegistryListener = eventBus.emitWhenRequested('datasets:registry', datasetRegistry)

  return {
    remove () {
      eventBus.off(events.MAP_SIZE_CHANGE, onMapSizeChange)
      removeRegistryListener()

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
