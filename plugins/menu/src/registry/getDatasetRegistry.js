// the local _datasetRegistry will only be initialised if the datasets plugin is in use,
// otherwise it will remain null.
let _datasetRegistry = null
let _isVisibleWhen = () => false

export const getDatasetRegistry = () => _datasetRegistry

export const getIsVisibleWhen = () => _isVisibleWhen

export const setDatasetRegistry = (datasetRegistry, isVisibleWhen) => {
  _datasetRegistry = datasetRegistry
  _isVisibleWhen = isVisibleWhen
}
