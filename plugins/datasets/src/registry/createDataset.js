import { Dataset } from './dataset.js'

export const createDataset = (datasetDefinition) => {
  return new Dataset(datasetDefinition)
}
