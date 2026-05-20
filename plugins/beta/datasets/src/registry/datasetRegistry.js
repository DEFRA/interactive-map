import { createDataset } from './createDataset.js'

const datasetRegistry = {
  attach (datasetsRef, orderedDatasetsRef) {
    this._datasets = datasetsRef
    this._orderedDatasets = orderedDatasetsRef
  },
  // createDataset defaults to a generic dataset factory function, but can be overridden by calling
  // attachCreateDataset, which allows the layer adapter to provide its own createDataset function,
  attachCreateDataset (createDataset) { this.createDataset = createDataset },
  createDataset: (datasetDefinition) => createDataset(datasetDefinition),
  // getDataset retrieves a dataset by id, creating a new Dataset instance that wraps the definition
  getDataset (id) { return this.createDataset(this.datasets[id]) },
  forEach (callback) {
    this._orderedDatasets.forEach((datasetId) => callback(this.getDataset(datasetId)))
  },
  forEachDataset (callback) {
    Object.values(this.datasets)
      .filter(def => !def.parentId) // Only top-level datasets
      .forEach((dataset) => callback(this.getDataset(dataset.id)))
  },
  topLevelDatasets () {
    return Object.values(this.datasets)
      .filter(def => !def.parentId)
      .map(def => this.getDataset(def.id))
  },
  _lastKeyItems: {},
  keyItems () {
    if (this.datasets === this._lastKeyItemsDatasets) {
      return this._lastKeyItems
    }
    this._lastKeyItemsDatasets = this.datasets
    const items = []
    const seenGroups = new Set()
    let hasGroups = false
    this.forEachDataset((dataset) => {
      if (!dataset.showInKey && dataset.visible) {
        return
      }
      if (dataset.hasSublayers) {
        const sublayers = dataset.sublayers.filter(sublayer => sublayer.visible)
        if (sublayers.length) {
          hasGroups = true
          items.push({ type: 'sublayers', dataset, sublayers })
        }
      } else if (dataset.groupLabel) {
        if (seenGroups.has(dataset.groupLabel)) {
          return
        }
        seenGroups.add(dataset.groupLabel)
        hasGroups = true
        items.push({
          type: 'group',
          groupLabel: dataset.groupLabel,
          datasets: this.topLevelDatasets()
            .filter(groupDataset => (groupDataset.groupLabel === dataset.groupLabel && !groupDataset.hasSublayers && groupDataset.showInKey))
        })
      } else {
        items.push({ type: 'flat', dataset })
      }
    })
    this._lastKeyItems = { items, hasGroups }
    return this._lastKeyItems
  }
}

Object.defineProperty(datasetRegistry, 'datasets', { get: () => datasetRegistry._datasets })

// TODO remove this global reference once development is finished
window.datasetRegistry = datasetRegistry

export { datasetRegistry }
