import { applyDatasetDefaults } from './defaults.js'
import { datasetsToMenu } from './reducers/datasetsToMenu.js'

const initialState = {
  globals: {
    visible: true,
    opacity: 1,
    // overrideDatasetOpacity:
    // 'local': dataset opacity is used instead if set;
    // 'global': local opacity is ignored
    // 'multiply': local opacity is multiplied by global opacity
    overrideDatasetOpacity: 'global'
  },
  datasets: null,
  key: {
    items: [],
    hasGroups: false
  },
  hiddenFeatures: {}, // { [layerId]: { idProperty: string, ids: string[] } }
  layerAdapter: null,
  layerAdapterActions: {
    setStyle: [],
    setDatasetVisibility: [],
    setOpacity: []
  }
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
  const { datasets, mappedDatasets, orderedDatasets } = payload
  const datasetsWithSublayerVisibility = datasets.map(initSublayerVisibility)
  const menu = payload.menu || datasetsToMenu({ datasets })
  return {
    ...state,
    datasets: datasetsWithSublayerVisibility,
    mappedDatasets,
    orderedDatasets,
    menu
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
  const { datasetId, visible } = payload
  const setDatasetVisibility = [...state.layerAdapterActions.setDatasetVisibility, [datasetId, visible]]
  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, setDatasetVisibility },
    datasets: state.datasets?.map(dataset =>
      dataset.id === datasetId ? { ...dataset, visible } : dataset
    ),
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: { ...state.mappedDatasets[datasetId], visible } }
  }
}

const setGlobalVisibility = (state, payload) => {
  const { visibility } = payload
  return {
    ...state,
    globals: { ...state.globals, visible: visibility !== 'hidden' },
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

const setLayerAdapterActions = (state, payload) => ({ ...state, layerAdapterActions: { ...state.layerAdapterActions, ...payload } })

const setDatasetStyle = (state, payload) => {
  const { datasetId, styleChanges, mapStyle } = payload
  const style = { ...state.mappedDatasets[datasetId].style, ...styleChanges }
  const dataset = { ...state.mappedDatasets[datasetId], ...styleChanges, style }
  const setStyle = [...state.layerAdapterActions.setStyle, [datasetId, mapStyle]]
  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, setStyle },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: dataset },
    datasets: state.datasets?.map(dataset =>
      dataset.id === datasetId ? { ...dataset, ...styleChanges } : dataset
    )
  }
}

const setOpacity = (state, payload) => {
  const { datasetId, opacity } = payload
  const style = { ...state.mappedDatasets[datasetId].style, opacity }
  const dataset = { ...state.mappedDatasets[datasetId], style }
  const setOpacity = [...state.layerAdapterActions.setOpacity, [datasetId, opacity]]
  return {
    ...state,
    layerAdapterActions: { ...state.layerAdapterActions, setOpacity },
    mappedDatasets: { ...state.mappedDatasets, [datasetId]: dataset },
    datasets: state.datasets?.map(dataset =>
      dataset.id === datasetId ? { ...dataset, opacity } : dataset
    )
  }
}

const setGlobalOpacity = (state, payload) => {
  const { opacity } = payload
  return {
    ...state,
    globals: { ...state.globals, opacity },
    datasets: state.datasets?.map(dataset => ({ ...dataset, opacity }))
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
  SET_LAYER_ADAPTER_ACTIONS: setLayerAdapterActions
}

export {
  initialState,
  actions
}
