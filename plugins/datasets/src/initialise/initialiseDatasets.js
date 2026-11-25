import { createDynamicSource } from '../fetch/createDynamicSource.js'
import { mappedDatasetsReducer } from '../reducers/mappedDatasetsReducer.js'
import { datasetsToMenu } from '../reducers/datasetsToMenu.js'

export const initialiseDatasets = ({
  adapter,
  datasetRegistry,
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
  const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets })
  if (adapter.createDataset) {
    datasetRegistry.attachCreateDataset(adapter.createDataset)
  }
  datasetRegistry.attach(mappedDatasets, orderedDatasets, mapStyle)
  const menu = datasetsToMenu({ datasets })

  eventBus.requestOnce('menu:state', menuStateRef => datasetRegistry.attachMenuStateRef(menuStateRef)) // Request the menu state from the menu plugin

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
        mapProvider,
        onUpdate: (datasetId, geojson) => adapter.setData(datasetId, geojson),
        onChange: (datasetId, changes) => adapter.updateData(datasetId, changes)
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

  eventBus.on('menu:changed', (menuState) => {
    datasetRegistry.invalidateKeyItemsOnMenuStateChange(menuState)
    adapter.applyGlobalVisibility()
  })

  return {
    remove () {
      eventBus.off(events.MAP_SIZE_CHANGE, onMapSizeChange)
      removeRegistryListener()

      // Clean up dynamic sources
      dynamicSources.forEach(source => source.destroy())
      dynamicSources.clear()
      adapter.destroy()
    }
  }
}
