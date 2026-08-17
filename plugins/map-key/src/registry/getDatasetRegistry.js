import eventBus from '../../../../src/services/eventBus.js'

// _datasetRegistry will only be initialised if the datasets plugin is in use,
// otherwise it will remain null.
let _datasetRegistry = null

eventBus.on('datasets:registryReady', (datasetRegistry) => {
  _datasetRegistry = datasetRegistry
})

export const getDatasetRegistry = () => _datasetRegistry
