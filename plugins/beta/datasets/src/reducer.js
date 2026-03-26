import { applyDatasetDefaults } from './defaults.js'

const initialState = {
  datasets: null,
  hiddenFeatures: {}, // { [layerId]: { idProperty: string, ids: string[] } }
  layerAdapter: null
}

const initRuleVisibility = (dataset) => {
  if (!dataset.featureStyleRules?.length) {
    return dataset
  }
  const ruleVisibility = {}
  dataset.featureStyleRules.forEach(rule => {
    ruleVisibility[rule.id] = 'visible'
  })
  return { ...dataset, ruleVisibility }
}

const setDatasets = (state, payload) => {
  const { datasets, datasetDefaults } = payload
  return {
    ...state,
    datasets: datasets.map(dataset => initRuleVisibility(applyDatasetDefaults(dataset, datasetDefaults)))
  }
}

const addDataset = (state, payload) => {
  const { dataset, datasetDefaults } = payload
  return {
    ...state,
    datasets: [
      ...(state.datasets || []),
      initRuleVisibility(applyDatasetDefaults(dataset, datasetDefaults))
    ]
  }
}

const removeDataset = (state, payload) => {
  const { id } = payload
  return {
    ...state,
    datasets: state.datasets?.filter(dataset => dataset.id !== id) || []
  }
}

const setDatasetVisibility = (state, payload) => {
  const { id, visibility } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset =>
      dataset.id === id ? { ...dataset, visibility } : dataset
    )
  }
}

const hideFeatures = (state, payload) => {
  const { layerId, idProperty, featureIds } = payload
  const existing = state.hiddenFeatures[layerId]
  const existingIds = existing?.ids || []
  const newIds = [...new Set([...existingIds, ...featureIds])]

  return {
    ...state,
    hiddenFeatures: {
      ...state.hiddenFeatures,
      [layerId]: { idProperty, ids: newIds }
    }
  }
}

const showFeatures = (state, payload) => {
  const { layerId, featureIds } = payload
  const existing = state.hiddenFeatures[layerId]
  if (!existing) {
    return state
  }

  const newIds = existing.ids.filter(id => !featureIds.includes(id))

  if (newIds.length === 0) {
    const rest = { ...state.hiddenFeatures }
    delete rest[layerId]
    return { ...state, hiddenFeatures: rest }
  }

  return {
    ...state,
    hiddenFeatures: {
      ...state.hiddenFeatures,
      [layerId]: { ...existing, ids: newIds }
    }
  }
}

const setRuleVisibility = (state, payload) => {
  const { datasetId, ruleId, visibility } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset => {
      if (dataset.id !== datasetId) {
        return dataset
      }
      return {
        ...dataset,
        ruleVisibility: {
          ...dataset.ruleVisibility,
          [ruleId]: visibility
        }
      }
    })
  }
}

const setLayerAdapter = (state, payload) => ({ ...state, layerAdapter: payload })

const actions = {
  SET_DATASETS: setDatasets,
  ADD_DATASET: addDataset,
  REMOVE_DATASET: removeDataset,
  SET_DATASET_VISIBILITY: setDatasetVisibility,
  SET_RULE_VISIBILITY: setRuleVisibility,
  HIDE_FEATURES: hideFeatures,
  SHOW_FEATURES: showFeatures,
  SET_LAYER_ADAPTER: setLayerAdapter
}

export {
  initialState,
  actions
}
