import { datasetsToMenu, addDatasetToMenu } from './reducers/datasetsToMenu.js'
import { mappedDatasetsReducer } from './reducers/mappedDatasetsReducer.js'

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
    setOpacity: [],
    addDataset: []
  }
}

const setDatasets = (state, payload) => {
  const { datasets, mappedDatasets, orderedDatasets } = payload
  const menu = payload.menu || datasetsToMenu({ datasets })
  return {
    ...state,
    datasets,
    mappedDatasets,
    orderedDatasets,
    menu
  }
}

const addDataset = (state, payload) => {
  const { dataset, mapStyle } = payload
  const { mappedDatasets: newDatasets, orderedDatasets: newOrderedDatasets } = mappedDatasetsReducer({ datasets: [dataset] })
  const menu = addDatasetToMenu(state, dataset)
  const addDataset = [...state.layerAdapterActions.addDataset, [dataset.id, mapStyle]]

  return {
    ...state,
    mappedDatasets: { ...state.mappedDatasets, ...newDatasets },
    orderedDatasets: [...state.orderedDatasets, ...newOrderedDatasets],
    menu,
    layerAdapterActions: { ...state.layerAdapterActions, addDataset },
    datasets: [
      ...(state.datasets || [])
    ]
  }
}

const removeDatasetsFromMenu = (menu, datasetsToRemove) => {
  return menu.reduce((newMenu, menuGroup) => {
    const filteredItems = menuGroup.items.filter(item => !datasetsToRemove.includes(item.id))
    if (filteredItems.length) {
      newMenu.push({ ...menuGroup, items: filteredItems })
    }
    return newMenu
  }, [])
}

const removeDataset = (state, payload) => {
  const { id } = payload
  const mappedDatasets = { ...state.mappedDatasets }
  const datasetsToRemove = [id, ...(mappedDatasets[id]?.sublayerIds || [])]
  datasetsToRemove.forEach((datasetId) => delete mappedDatasets[datasetId])
  // Remove from orderedDatasets
  const orderedDatasets = state.orderedDatasets.filter(datasetId => !datasetsToRemove.includes(datasetId))
  // Remove from menu, and remove any menu groups that are left with no items
  const menu = removeDatasetsFromMenu(state.menu, datasetsToRemove)
  return {
    ...state,
    datasets: state.datasets?.filter(dataset => dataset.id !== id) || [],
    mappedDatasets,
    orderedDatasets,
    menu
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
