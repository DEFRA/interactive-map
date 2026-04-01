import { datasetDefaults } from '../defaults.js'

export const addDataset = ({ pluginState, mapState }, dataset) => {
  pluginState.layerAdapter?.addDataset({ ...datasetDefaults, ...dataset }, mapState.mapStyle)
  pluginState.dispatch({ type: 'ADD_DATASET', payload: { dataset, datasetDefaults } })
}
