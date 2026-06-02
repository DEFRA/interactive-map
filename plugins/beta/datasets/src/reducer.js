import { datasetsToMenu, addDatasetToMenu, removeDatasetsFromMenu } from './reducers/datasetsToMenu.js'
import { mappedDatasetsReducer } from './reducers/mappedDatasetsReducer.js'
import { logger } from '../../../../src/services/logger.js'

const initialState = {
  globals: {
    visible: true,
    opacity: 1,
    opacityMode: 'dataset'
    // 'dataset': registryDataset opacity is used instead if set;
    // 'global': registryDataset opacity is ignored
    // 'multiply': registryDataset opacity is multiplied by parent opacity and global opacity
  },
  key: {
    items: [],
    hasGroups: false
  },
  layerAdapter: null,
  layerAdapterActions: {
    applyStyle: [],
    applyDatasetVisibility: [],
    setOpacity: [],
    addDataset: [],
    applyFeatureFilter: []
  }
}

const validateDatasetExists = (state, datasetId, prefix, suffix = 'not found') => {
  if (!state.mappedDatasets[datasetId]) {
    logger.error(`${prefix}: Dataset with id '${datasetId}' ${suffix}`)
    return false
  }
  return true
}

const initialiseGlobalState = (state, payload) => {
  return {
    ...state,
    globals: { ...state.globals, ...payload }
  }
}

const setDatasets = (state, payload) => {
  const { datasets, mappedDatasets, orderedDatasets } = payload
  const menu = payload.menu || datasetsToMenu({ datasets })
  return {
    ...state,
    mappedDatasets,
    orderedDatasets,
    menu
  }
}

const addDataset = (state, payload) => {
  const { dataset, mapStyle } = payload
  if (state.mappedDatasets[dataset.id]) {
    logger.error(`addDataset: Dataset with id '${dataset.id}' already exists`)
    return state
  }
  const { mappedDatasets: newDatasets, orderedDatasets: newOrderedDatasets } = mappedDatasetsReducer({ datasets: [dataset] })
  const menu = addDatasetToMenu(state, dataset)
  const addDataset = [...state.layerAdapterActions.addDataset, [dataset.id, mapStyle]]

  return {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, ...newDatasets },
    orderedDatasets: [...state.orderedDatasets, ...newOrderedDatasets],
    menu,
    layerAdapterActions: { ...state.layerAdapterActions, addDataset }
  }
}

const removeDataset = (state, payload) => {
  const { id } = payload
  if (!validateDatasetExists(state, id, 'removeDataset')) {
    return state
  }
  const mappedDatasets = { ...state.mappedDatasets }
  const datasetsToRemove = [id, ...(mappedDatasets[id]?.sublayerIds || [])]
  datasetsToRemove.forEach((datasetId) => delete mappedDatasets[datasetId])
  // Remove from orderedDatasets
  const orderedDatasets = state.orderedDatasets.filter(datasetId => !datasetsToRemove.includes(datasetId))
  // Remove from menu, and remove any menu groups that are left with no items
  return {
    ...state,
    mappedDatasets,
    orderedDatasets,
    menu: removeDatasetsFromMenu(state.menu, datasetsToRemove)
  }
}

const setDatasetVisibility = (state, payload) => {
  const { datasetId, visible } = payload
  if (!validateDatasetExists(state, datasetId, 'setDatasetVisibility')) {
    return state
  }
  const applyDatasetVisibility = [...state.layerAdapterActions.applyDatasetVisibility, [datasetId, visible]]
  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, applyDatasetVisibility },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: { ...state.mappedDatasets[datasetId], visible } }
  }
}

const setGlobalVisibility = (state, payload) => {
  const { visibility } = payload
  return {
    ...state,
    globals: { ...state.globals, visible: visibility !== 'hidden' }
  }
}

const hideFeatures = (state, payload) => {
  const { datasetId, featureIds } = payload
  if (!validateDatasetExists(state, datasetId, 'setFeatureVisibility - hideFeatures')) {
    return state
  }
  const mappedDataset = { ...state.mappedDatasets[datasetId] }
  const existingIds = mappedDataset.hiddenFeatures || []
  const newIds = [...new Set([...existingIds, ...featureIds])]
  mappedDataset.hiddenFeatures = newIds
  const applyFeatureFilter = [...state.layerAdapterActions.applyFeatureFilter, [datasetId]]

  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, applyFeatureFilter },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: mappedDataset }
  }
}

const showFeatures = (state, payload) => {
  const { datasetId, featureIds } = payload
  if (!validateDatasetExists(state, datasetId, 'setFeatureVisibility - showFeatures')) {
    return state
  }
  const mappedDataset = { ...state.mappedDatasets[datasetId] }
  const existingIds = mappedDataset.hiddenFeatures || []
  const newIds = existingIds.filter(id => !featureIds.includes(id))
  mappedDataset.hiddenFeatures = newIds.length ? newIds : [-1] // If no features are hidden, set to -1 to force a filter update
  const applyFeatureFilter = [...state.layerAdapterActions.applyFeatureFilter, [datasetId]]

  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, applyFeatureFilter },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: mappedDataset }
  }
}

const setLayerAdapterActions = (state, payload) => ({ ...state, layerAdapterActions: { ...state.layerAdapterActions, ...payload } })

const setDatasetStyle = (state, payload) => {
  const { datasetId, styleChanges, mapStyle } = payload
  if (!validateDatasetExists(state, datasetId, 'setDatasetStyle')) {
    return state
  }
  const style = { ...state.mappedDatasets[datasetId].style, ...styleChanges }
  const dataset = { ...state.mappedDatasets[datasetId], ...styleChanges, style }
  const applyStyle = [...state.layerAdapterActions.applyStyle, [datasetId, mapStyle]]
  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, applyStyle },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: dataset }
  }
}

const setOpacity = (state, payload) => {
  const { datasetId, opacity } = payload
  if (!validateDatasetExists(state, datasetId, 'setOpacity')) {
    return state
  }
  const style = { ...state.mappedDatasets[datasetId].style, opacity }
  const dataset = { ...state.mappedDatasets[datasetId], style }
  const setOpacity = [...state.layerAdapterActions.setOpacity, [datasetId, opacity]]
  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, setOpacity },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: dataset }
  }
}

const setGlobalOpacity = (state, payload) => {
  const { opacity } = payload
  return {
    ...state,
    globals: { ...state.globals, opacity }
  }
}

const setLayerAdapter = (state, payload) => ({ ...state, layerAdapter: payload })

const actions = {
  SET_DATASETS: setDatasets,
  ADD_DATASET: addDataset,
  REMOVE_DATASET: removeDataset,
  SET_DATASET_VISIBILITY: setDatasetVisibility,
  SET_GLOBAL_VISIBILITY: setGlobalVisibility,
  SET_DATASET_STYLE: setDatasetStyle,
  SET_OPACITY: setOpacity,
  SET_GLOBAL_OPACITY: setGlobalOpacity,
  HIDE_FEATURES: hideFeatures,
  SHOW_FEATURES: showFeatures,
  SET_LAYER_ADAPTER: setLayerAdapter,
  SET_LAYER_ADAPTER_ACTIONS: setLayerAdapterActions,
  INITIALISE_GLOBAL_STATE: initialiseGlobalState
}

export {
  initialState,
  actions
}
