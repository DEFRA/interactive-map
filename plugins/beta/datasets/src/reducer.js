import { applyDatasetDefaults } from './defaults.js'

const initialState = {
  datasets: null,
  hiddenFeatures: {}, // { [layerId]: { idProperty: string, ids: string[] } }
  layerAdapter: null
}

const initSublayerVisibility = (dataset) => {
  if (!dataset.sublayers?.length) {
    return dataset
  }
  const sublayerVisibility = {}
  dataset.sublayers.forEach(sublayer => {
    sublayerVisibility[sublayer.id] = 'visible'
  })
  return { ...dataset, sublayerVisibility }
}

const setDatasets = (state, payload) => {
  const { datasets, datasetDefaults } = payload
  return {
    ...state,
    datasets: datasets.map(dataset => initSublayerVisibility(applyDatasetDefaults(dataset, datasetDefaults)))
  }
}

const addDataset = (state, payload) => {
  const { dataset, datasetDefaults } = payload
  return {
    ...state,
    datasets: [
      ...(state.datasets || []),
      initSublayerVisibility(applyDatasetDefaults(dataset, datasetDefaults))
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

const setGlobalVisibility = (state, payload) => {
  const { visibility } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset => ({ ...dataset, visibility }))
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

const setSublayerVisibility = (state, payload) => {
  const { datasetId, sublayerId, visibility } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset => {
      if (dataset.id !== datasetId) {
        return dataset
      }
      return {
        ...dataset,
        sublayerVisibility: {
          ...dataset.sublayerVisibility,
          [sublayerId]: visibility
        }
      }
    })
  }
}

const setDatasetStyle = (state, payload) => {
  const { datasetId, styleChanges } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset =>
      dataset.id === datasetId ? { ...dataset, ...styleChanges } : dataset
    )
  }
}

const setSublayerStyle = (state, payload) => {
  const { datasetId, sublayerId, styleChanges } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset => {
      if (dataset.id !== datasetId) {
        return dataset
      }
      return {
        ...dataset,
        sublayers: dataset.sublayers?.map(sublayer =>
          sublayer.id === sublayerId
            ? { ...sublayer, style: { ...sublayer.style, ...styleChanges } }
            : sublayer
        )
      }
    })
  }
}

const setOpacity = (state, payload) => {
  const { datasetId, opacity } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset =>
      dataset.id === datasetId ? { ...dataset, opacity } : dataset
    )
  }
}

const setGlobalOpacity = (state, payload) => {
  const { opacity } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset => ({ ...dataset, opacity }))
  }
}

const setSublayerOpacity = (state, payload) => {
  const { datasetId, sublayerId, opacity } = payload
  return {
    ...state,
    datasets: state.datasets?.map(dataset => {
      if (dataset.id !== datasetId) {
        return dataset
      }
      return {
        ...dataset,
        sublayers: dataset.sublayers?.map(sublayer =>
          sublayer.id === sublayerId
            ? { ...sublayer, style: { ...sublayer.style, opacity } }
            : sublayer
        )
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
  SET_GLOBAL_VISIBILITY: setGlobalVisibility,
  SET_SUBLAYER_VISIBILITY: setSublayerVisibility,
  SET_DATASET_STYLE: setDatasetStyle,
  SET_SUBLAYER_STYLE: setSublayerStyle,
  SET_OPACITY: setOpacity,
  SET_GLOBAL_OPACITY: setGlobalOpacity,
  SET_SUBLAYER_OPACITY: setSublayerOpacity,
  HIDE_FEATURES: hideFeatures,
  SHOW_FEATURES: showFeatures,
  SET_LAYER_ADAPTER: setLayerAdapter
}

export {
  initialState,
  actions
}
