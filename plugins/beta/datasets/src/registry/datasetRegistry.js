import { Dataset } from './dataset.js'

const datasetRegistry = {
  attach (datasetsRef) { this._datasets = datasetsRef },

  getDataset (id) { return new Dataset(this.datasets[id]) }
}

Object.defineProperty(datasetRegistry, 'datasets', { get: () => datasetRegistry._datasets })

// TODO remove this global reference once development is finished
window.datasetRegistry = datasetRegistry

export { datasetRegistry }
