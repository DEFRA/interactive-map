import { datasetDefaults } from '../defaults.js'
import { addMapLayers } from '../mapLayers.js'

export const addDataset = ({ mapProvider, mapState, pluginState }, dataset) => {
  const map = mapProvider.map

  // Add source and layers to the map
  addMapLayers(map, mapState.mapStyle.id, { ...datasetDefaults, ...dataset })

  // Update state
  pluginState.dispatch({ type: 'ADD_DATASET', payload: { dataset, datasetDefaults } })
}