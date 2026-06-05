import { datasetsToMenu, addDatasetToMenu, removeDatasetsFromMenu } from './datasetsToMenu.js'
import { mappedDatasetsReducer } from './mappedDatasetsReducer.js'
import { logger } from '../../../../../src/services/logger.js'

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
  actionsArray: []
}

const validateDatasetExists = (state, datasetId, prefix, suffix = 'not found') => {
  if (!state.mappedDatasets[datasetId]) {
    logger.error(`${prefix}: Dataset with id '${datasetId}' ${suffix}`)
    return false
  }
  return true
}

let actionId = 0
const addAction = (method, parameters, state) => {
  actionId = state.actionsArray.length ? actionId + 1 : 0
  return { ...state, actionsArray: [...state.actionsArray, { method, parameters, actionId }] }
}

const setGlobalState = (state, payload) => {
  // For now we only have opacityMode, but if we add more global state
  // properties we may not require applyGlobalOpacity to be triggered here.
  return addAction('applyGlobalOpacity', [], {
    ...state,
    globals: { ...state.globals, ...payload }
  })
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

  return addAction('addDataset', [dataset.id, mapStyle], {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, ...newDatasets },
    orderedDatasets: [...state.orderedDatasets, ...newOrderedDatasets],
    menu
  })
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

  return addAction('applyDatasetVisibility', [datasetId, visible], {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: { ...state.mappedDatasets[datasetId], visible } }
  })
}

const setGlobalVisibility = (state, payload) => {
  const { visible } = payload

  return addAction('applyGlobalVisibility', [visible], {
    ...state,
    globals: { ...state.globals, visible }
  })
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

  return addAction('applyFeatureFilter', [datasetId], {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: mappedDataset }
  })
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

  return addAction('applyFeatureFilter', [datasetId], {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: mappedDataset }
  })
}

const removeAdapterActions = (state, completedActions) => {
  if (!completedActions?.length) { return state }
  return {
    ...state,
    actionsArray: state.actionsArray.filter((current) => !completedActions.includes(current))
  }
}

const setDatasetStyle = (state, payload) => {
  const { datasetId, styleChanges, mapStyle } = payload
  if (!validateDatasetExists(state, datasetId, 'setDatasetStyle')) {
    return state
  }
  const style = { ...state.mappedDatasets[datasetId].style, ...styleChanges }
  const dataset = { ...state.mappedDatasets[datasetId], ...styleChanges, style }

  return addAction('applyStyle', [datasetId, mapStyle], {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: dataset }
  })
}

const setOpacity = (state, payload) => {
  const { datasetId, opacity } = payload
  if (!validateDatasetExists(state, datasetId, 'setOpacity')) {
    return state
  }
  const style = { ...state.mappedDatasets[datasetId].style, opacity }
  const dataset = { ...state.mappedDatasets[datasetId], style }

  return addAction('applyDatasetOpacity', [datasetId], {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: dataset }
  })
}

const setGlobalOpacity = (state, payload) => {
  const { opacity } = payload
  return addAction('applyGlobalOpacity', [], {
    ...state,
    globals: { ...state.globals, opacity }
  })
}

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
  REMOVE_ADAPTER_ACTIONS: removeAdapterActions,
  SET_GLOBAL_STATE: setGlobalState
}

export {
  initialState,
  actions
}
