import { Dataset } from './dataset.js'

export const createDataset = (datasetDefinition, datasetRegistry) => {
  return new Dataset(datasetDefinition, datasetRegistry)
}
