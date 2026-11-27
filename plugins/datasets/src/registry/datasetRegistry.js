import { createDataset } from './createDataset.js'
import { DatasetDefinitionCache } from './datasetDefinitionCache.js'
import { isVisibleWhen } from './isVisibleWhen.js'

// Shared by every registry; each registry's own state is set in createDatasetRegistry
const datasetRegistryMethods = {
  attach (datasetsRef, orderedDatasetsRef, mapStyle) {
    this._datasets = datasetsRef
    this._orderedDatasets = orderedDatasetsRef
    this.attachMapStyle(mapStyle)
    this._invalidateChangedDatasets()
  },

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
  _createDataset: (datasetDefinition, datasetRegistry) => createDataset(datasetDefinition, datasetRegistry),

  attachMapStyle (mapStyle) {
    if (mapStyle) {
      this._mapStyle = mapStyle
    }
  },

  get mapStyle () {
    return this._mapStyle
  },

  attachGlobals (globals) {
    if (globals) {
      this._globals = globals
    }
  },

  get globals () {
    return this._globals
  },

  attachMenuStateRef (menuStateRef) {
    this._menuStateRef = menuStateRef
  },

  isVisibleWhen (visibleWhen) {
    return isVisibleWhen(visibleWhen, {
      mapStyleId: this._mapStyle?.id,
      menuState: this._menuStateRef?.current?.menuState
    })
  },

  get datasets () {
    return this._datasets
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
    const registryDataset = this._createDataset(definition, this)
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

  invalidateKeyItemsOnMenuStateChange (menuState) {
    if (menuState === this._lastMenuState) {
      return
    }
    this._lastMenuState = menuState
    this._lastKeyItemsDatasets = null
  },
  keyItems () {
    if (this.datasets === this._lastKeyItemsDatasets) {
      return this._lastKeyItems
    }
    this._lastKeyItemsDatasets = this.datasets
    const _items = []
    const groups = new Map()

    const getOrCreateGroup = (groupLabel, groupId) => {
      if (groups.has(groupId)) {
        return groups.get(groupId)
      }
      const groupObject = {
        type: 'group',
        id: groupId,
        groupLabel,
        keyDefinitions: []
      }
      groups.set(groupId, groupObject)
      _items.push(groupObject)
      return groupObject
    }

    this.forEach((dataset) => {
      if (!dataset.keyVisibility) {
        return
      }
      const isGroup = dataset.hasSublayers || dataset.groupId || dataset.groupLabel
      if (!isGroup) {
        _items.push({ type: 'flat', id: dataset.id, keyDefinition: dataset.keyDefinition })
        return
      }

      const groupId = dataset.groupId
      const groupLabel = dataset.groupLabel || groupId || dataset.label
      const groupObject = getOrCreateGroup(groupLabel, groupId)
      if (!dataset.hasSublayers) {
        groupObject.keyDefinitions.push(dataset.keyDefinition)
      }
    })
    const items = _items.filter((item) => item.type === 'flat' || Boolean(item.keyDefinitions?.length))
    const hasGroups = items.some(item => item.type === 'group')
    this._lastKeyItems = { items, hasGroups }
    return this._lastKeyItems
  }
}

// Each datasets plugin instance (one per map) creates its own registry, so maps on the same page
// never see each other's datasets
export const createDatasetRegistry = () => Object.assign(Object.create(datasetRegistryMethods), {
  _definitionCache: new DatasetDefinitionCache(),
  _globals: {},
  _menuStateRef: {},
  _lastMenuState: {},
  _lastKeyItems: {}
})
