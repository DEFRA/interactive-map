import eventBus from '../../../../src/services/eventBus.js'

// _datasetRegistry will only be initialised if the datasets plugin is in use,
// otherwise it will remain null.
let _datasetRegistry = null

// The map-key plugin, requires access to the datasets registry, so it can render the
// datasets key items.
// However, the order the plugins are added can affect whether the event is emitted
// before or after the map-key plugin is loaded. So, if the datasets plugin is loaded
// first, it will emit the datasets:registryReady event, and the map-key plugin will
// receive it. Otherwise, the map-key plugin will emit the
// datasets:requestRegistry event, and the datasets plugin will respond.
eventBus.on('datasets:registryReady', (datasetRegistry) => {
  _datasetRegistry = datasetRegistry
})

eventBus.emit('datasets:requestRegistry')

export const getDatasetRegistry = () => _datasetRegistry
