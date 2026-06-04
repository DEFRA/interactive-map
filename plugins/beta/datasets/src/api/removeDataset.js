import { layerAdapter } from '../initialise/loadLayerAdapter.js'

export const removeDataset = ({ pluginState: { dispatch } }, datasetId) => {
  // Here we need to remove the dataset from the adapter before removing it from state,
  // otherwise the datasetDefinition will have been removed from the registry by the
  // time the adapter tries to remove the dataset, which causes an error
  layerAdapter.removeDataset(datasetId)
  dispatch({ type: 'REMOVE_DATASET', payload: { id: datasetId } })
}
