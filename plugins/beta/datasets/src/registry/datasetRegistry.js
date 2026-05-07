const datasetRegistry = {
  attach (datasetsRef) {
    this.datasetsRef = datasetsRef
  },

  getDataset (id) {
    return this.datasets[id]
  }
}

Object.defineProperty(datasetRegistry, 'datasets', { get: () => datasetRegistry.datasetsRef })

// TODO remove this global reference once development is finished
window.datasetRegistry = datasetRegistry

export { datasetRegistry }
