const initialState = {
  datasets: null,
  hiddenFeatures: {} // { [layerId]: { idProperty: string, ids: string[] } }
}

const setDatasets = (state, payload) => {
  const { datasets, datasetDefaults } = payload
  return {
    ...state,
    datasets: datasets.map(dataset => ({
      ...datasetDefaults,
      ...dataset
    }))
  }
}

const addDataset = (state, payload) => {
  const { dataset, datasetDefaults } = payload
  return {
    ...state,
    datasets: [
      ...(state.datasets || []),
      { ...datasetDefaults, ...dataset }
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
  if (!existing) return state

  const newIds = existing.ids.filter(id => !featureIds.includes(id))

  if (newIds.length === 0) {
    const { [layerId]: _, ...rest } = state.hiddenFeatures
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

const actions = {
  SET_DATASETS: setDatasets,
  ADD_DATASET: addDataset,
  REMOVE_DATASET: removeDataset,
  SET_DATASET_VISIBILITY: setDatasetVisibility,
  HIDE_FEATURES: hideFeatures,
  SHOW_FEATURES: showFeatures
}

export {
  initialState,
  actions
}
