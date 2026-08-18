// the local _datasetRegistry will only be initialised if the datasets plugin is in use,
// otherwise it will remain null.
let _datasetRegistry = null

export const getDatasetRegistry = () => _datasetRegistry
export const setDatasetRegistry = (datasetRegistry) => (_datasetRegistry = datasetRegistry)
