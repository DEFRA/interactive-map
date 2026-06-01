import { createDataset } from './createDataset.js'

class DatasetDefinitionCache {
  constructor () {
    this.idToDefinitionMap = new Map()
    this.definitionToInstanceMap = new Map()
  }

  add (registryDataset) {
    this.idToDefinitionMap.set(registryDataset.id, registryDataset._datasetDefinition)
    this.definitionToInstanceMap.set(registryDataset._datasetDefinition, registryDataset)
  }

  invalidateDataset (registryDataset) {
    const existingDefinition = this.idToDefinitionMap.get(registryDataset.id)
    const allIds = [existingDefinition.id, ...(existingDefinition?.sublayerIds || [])]
    allIds.forEach(id => {
      const existingDefinition = this.idToDefinitionMap.get(id)
      this.definitionToInstanceMap.delete(existingDefinition)
      this.idToDefinitionMap.delete(id)
    })
  }

  invalidateChangedDatasets (newDatasets) {
    newDatasets.forEach((datasetDefinition) => {
      const existingDefinition = this.idToDefinitionMap.get(datasetDefinition.id)
      if (existingDefinition && existingDefinition !== datasetDefinition) {
        const instance = this.definitionToInstanceMap.get(existingDefinition)
        this.invalidateDataset(instance.isSublayer && instance.parent ? instance.parent : instance)
      }
    })
  }

  getByDefinition (datasetDefinition) {
    return this.definitionToInstanceMap.get(datasetDefinition)
  }
}

const datasetRegistry = {
  attach (datasetsRef, orderedDatasetsRef) {
    this._datasets = datasetsRef
    this._orderedDatasets = orderedDatasetsRef
    this._invalidateChangedDatasets()
  },
  _definitionCache: new DatasetDefinitionCache(),
  _invalidateCache () { // used in tests to clear the cache between runs
    this._definitionCache = new DatasetDefinitionCache()
  },
  _invalidateChangedDatasets () { // used in tests to clear the cache between runs
    if (this._datasets) {
      this._definitionCache.invalidateChangedDatasets(Object.values(this._datasets))
    } else {
      this._invalidateCache()
    }
  },
  // createDataset defaults to a generic dataset factory function, but can be overridden by calling
  // attachCreateDataset, which allows the layer adapter to provide its own createDataset function,
  attachCreateDataset (createDataset) { this._createDataset = createDataset },
  _createDataset: (datasetDefinition) => createDataset(datasetDefinition),

  // getDataset retrieves a dataset by id, creating a new Dataset instance that wraps the definition
  getDataset (id) {
    const definition = this.datasets[id]
    if (!definition) {
      return undefined
    }
    const cachedDefinition = this._definitionCache.getByDefinition(definition)
    if (cachedDefinition) {
      return cachedDefinition
    }
    const registryDataset = this._createDataset(definition)
    this._definitionCache.add(registryDataset)
    if (registryDataset.isSublayer) {
      // Ensure the parent dataset is also cached
      this.getDataset(registryDataset.parentId)
    }
    return registryDataset
  },

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

  getPatternAndSymbolConfigs () {
    return this.topLevelDatasets().reduce((acc, dataset) => {
      return {
        ...acc,
        patternConfigs: [...acc.patternConfigs, ...dataset.patternConfigs],
        symbolConfigs: [...acc.symbolConfigs, ...dataset.symbolConfigs]
      }
    }, { patternConfigs: [], symbolConfigs: [] })
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
      if (!(dataset.showInKey && dataset.visible)) {
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
