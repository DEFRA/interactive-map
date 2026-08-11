import { createDataset } from './createDataset.js'
import { DatasetDefinitionCache } from './datasetDefinitionCache.js'

const datasetRegistry = {
  attach (datasetsRef, orderedDatasetsRef, mapStyle) {
    this._datasets = datasetsRef
    this._orderedDatasets = orderedDatasetsRef
    this.attachMapStyle(mapStyle)
    this._invalidateChangedDatasets()
  },

  _definitionCache: new DatasetDefinitionCache(),

  _invalidateCache () { // used in tests to clear the cache between runs
    this._definitionCache = new DatasetDefinitionCache()
  },

  _invalidateChangedDatasets () {
    if (this._datasets) {
      this._definitionCache.invalidateChangedDatasets(Object.values(this._datasets))
    } else {
      this._invalidateCache()
    }
  },

  // createDataset defaults to a generic dataset factory function, but can be overridden by calling
  // attachCreateDataset, which allows the layer adapter to provide its own createDataset function,
  attachCreateDataset (newCreateDatasetFunction) { this._createDataset = newCreateDatasetFunction },
  _createDataset: (datasetDefinition) => createDataset(datasetDefinition),

  attachMapStyle (mapStyle) {
    if (mapStyle) {
      this._mapStyle = mapStyle
    }
  },

  get mapStyle () {
    return this._mapStyle
  },

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

  invalidateKeyItems () {
    this._lastKeyItemsDatasets = null
  },
  _lastKeyItems: {},
  keyItems () {
    if (this.datasets === this._lastKeyItemsDatasets) {
      return this._lastKeyItems
    }
    this._lastKeyItemsDatasets = this.datasets
    const _items = []
    const groups = new Map()

    const getOrCreateGroup = (groupLabel) => {
      if (groups.has(groupLabel)) {
        return groups.get(groupLabel)
      }
      const groupObject = {
        type: 'group',
        groupLabel,
        datasets: []
      }
      groups.set(groupLabel, groupObject)
      _items.push(groupObject)
      return groupObject
    }

    this.forEach((dataset) => {
      if (!(dataset.showInKey && dataset.keyVisibility)) {
        return
      }
      const isGroup = dataset.hasSublayers || dataset.groupLabel
      if (!isGroup) {
        _items.push({ type: 'flat', dataset })
        return
      }

      const groupLabel = dataset.groupLabel || dataset.label
      const groupObject = getOrCreateGroup(groupLabel)
      if (!dataset.hasSublayers) {
        groupObject.datasets.push(dataset)
      }
    })
    const items = _items.filter((item) => item.type === 'flat' || Boolean(item.datasets?.length))
    const hasGroups = items.some(item => item.type === 'group')
    this._lastKeyItems = { items, hasGroups }
    return this._lastKeyItems
  }
}

Object.defineProperty(datasetRegistry, 'datasets', { get: () => datasetRegistry._datasets })

export { datasetRegistry }
