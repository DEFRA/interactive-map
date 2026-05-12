import { createDataset } from './createDataset.js'

const datasetRegistry = {
  attach (datasetsRef) { this._datasets = datasetsRef },
  // createDataset defaults to a generic dataset factory function, but can be overridden by calling
  // attachCreateDataset, which allows the layer adapter to provide its own createDataset function,
  attachCreateDataset (createDataset) { this.createDataset = createDataset },
  createDataset: (datasetDefinition) => createDataset(datasetDefinition),
  // getDataset retrieves a dataset by id, creating a new Dataset instance that wraps the definition
  getDataset (id) { return this.createDataset(this.datasets[id]) }
}

Object.defineProperty(datasetRegistry, 'datasets', { get: () => datasetRegistry._datasets })

// TODO remove this global reference once development is finished
window.datasetRegistry = datasetRegistry

export { datasetRegistry }
