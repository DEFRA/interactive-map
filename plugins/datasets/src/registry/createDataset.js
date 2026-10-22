import { Dataset } from './dataset.js'

export const createDataset = (datasetDefinition, registry) => {
  return new Dataset(datasetDefinition, registry)
}
