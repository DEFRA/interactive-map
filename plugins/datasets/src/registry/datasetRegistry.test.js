import { Dataset } from './dataset.js'
import { datasetRegistry } from './datasetRegistry.js'
import { mappedDatasetsReducer } from '../reducers/mappedDatasetsReducer.js'
import { datasetsWithGroups } from '../reducers/__data__/demoDatasets.js'
// Use the mock datasetRegistry with the demo datasets attached before each test.
// Dataset must be imported before datasetRegistry so that dataset.js is cached before
// the mock initialization triggers requireActual, avoiding a circular re-entry that
// would leave datasetRegistry undefined inside the mock.
jest.mock('./datasetRegistry.js')

describe('datasetRegistry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    datasetRegistry._invalidateCache()
  })
  describe('attach', () => {
    it("doesn't throw when no datasets are attached", () => {
      expect(() => datasetRegistry.attach(undefined)).not.toThrow()
    })
  })

  describe('getDataset', () => {
    it('returns a Dataset instance for a known id', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset).toBeInstanceOf(Dataset)
    })

    it('returns the correct id', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      expect(dataset.id).toBe('existing-fields')
    })

    it('returns a Dataset instance for a sublayer id', () => {
      const dataset = datasetRegistry.getDataset('land-covers-130-131')
      expect(dataset).toBeInstanceOf(Dataset)
      expect(dataset.id).toBe('land-covers-130-131')
    })

    it('returns undefined for an unknown id', () => {
      expect(datasetRegistry.getDataset('non-existent')).toBeUndefined()
    })
  })

  describe('forEach', () => {
    it('calls the callback once per dataset in orderedDatasets order', () => {
      const ids = []
      datasetRegistry.forEach(dataset => ids.push(dataset.id))
      expect(ids).toEqual(datasetRegistry._orderedDatasets)
    })

    it('passes Dataset instances to the callback', () => {
      datasetRegistry.forEach(dataset => expect(dataset).toBeInstanceOf(Dataset))
    })
  })

  describe('forEachDataset', () => {
    it('calls the callback only for top-level datasets', () => {
      const ids = []
      datasetRegistry.forEachDataset(dataset => ids.push(dataset.id))
      expect(ids).toEqual(['land-covers', 'existing-fields', 'historic-monuments', 'hedge-control'])
    })

    it('does not include sublayers', () => {
      const ids = []
      datasetRegistry.forEachDataset(dataset => ids.push(dataset.id))
      expect(ids).not.toContain('land-covers-130-131')
    })

    it('passes Dataset instances to the callback', () => {
      datasetRegistry.forEachDataset(dataset => expect(dataset).toBeInstanceOf(Dataset))
    })
  })

  describe('topLevelDatasets', () => {
    it('returns only top-level dataset ids', () => {
      const ids = datasetRegistry.topLevelDatasets().map(d => d.id)
      expect(ids).toEqual(['land-covers', 'existing-fields', 'historic-monuments', 'hedge-control'])
    })

    it('does not include sublayers', () => {
      const ids = datasetRegistry.topLevelDatasets().map(d => d.id)
      expect(ids).not.toContain('land-covers-130-131')
    })

    it('returns Dataset instances', () => {
      datasetRegistry.topLevelDatasets().forEach(d => expect(d).toBeInstanceOf(Dataset))
    })
  })

  describe('getPatternAndSymbolConfigs', () => {
    it('returns an object with patternConfigs and symbolConfigs arrays', () => {
      const result = datasetRegistry.getPatternAndSymbolConfigs()
      expect(Array.isArray(result.patternConfigs)).toBe(true)
      expect(Array.isArray(result.symbolConfigs)).toBe(true)
    })

    it('collects fill pattern configs from sublayers', () => {
      const { patternConfigs } = datasetRegistry.getPatternAndSymbolConfigs()
      // land-covers sublayers each have a fillPattern style
      expect(patternConfigs.length).toBeGreaterThan(0)
    })

    it('collects symbol configs from sublayers', () => {
      const { symbolConfigs } = datasetRegistry.getPatternAndSymbolConfigs()
      // historic-monuments sublayers inherit symbol: 'square' from their parent
      expect(symbolConfigs.length).toBeGreaterThan(0)
    })

    it('returns empty arrays when no datasets have patterns or symbols', () => {
      datasetRegistry.attach({ simple: { id: 'simple', style: { stroke: '#ff0000' } } })
      const { patternConfigs, symbolConfigs } = datasetRegistry.getPatternAndSymbolConfigs()
      expect(patternConfigs).toHaveLength(0)
      expect(symbolConfigs).toHaveLength(0)
    })
  })

  describe('keyItems', () => {
    it('returns an object with an items array and hasGroups boolean', () => {
      const { items, hasGroups } = datasetRegistry.keyItems()
      expect(Array.isArray(items)).toBe(true)
      expect(typeof hasGroups).toBe('boolean')
    })

    it('includes a sublayers entry for each dataset that has sublayers', () => {
      const { items } = datasetRegistry.keyItems()
      const sublayerItems = items.filter(item => item.type === 'sublayers')
      expect(sublayerItems).toHaveLength(2) // land-covers and historic-monuments
    })

    it('includes a flat entry for datasets without sublayers and no groupLabel', () => {
      const { items } = datasetRegistry.keyItems()
      const flatItems = items.filter(item => item.type === 'flat')
      expect(flatItems).toHaveLength(1) // existing-fields
    })

    it('sets hasGroups to true when any item has sublayers', () => {
      const { hasGroups } = datasetRegistry.keyItems()
      expect(hasGroups).toBe(true)
    })

    it('sets hasGroups to false when all items are flat with no groupLabel', () => {
      datasetRegistry.attach({ simple: { id: 'simple', showInKey: true, visible: true, style: {} } })
      const { hasGroups } = datasetRegistry.keyItems()
      expect(hasGroups).toBe(false)
    })

    it('sets hasGroups to false when a dataset has only one sublayer and it is not visible', () => {
      const { mappedDatasets: singleHiddenSublayer } = mappedDatasetsReducer({
        datasets: [{
          id: 'single-sublayer-dataset',
          showInKey: true,
          visible: true,
          style: {},
          sublayers: [{ id: 'sub', visible: false, style: {} }]
        }]
      })
      datasetRegistry.attach(singleHiddenSublayer)
      const { hasGroups } = datasetRegistry.keyItems()
      expect(hasGroups).toBe(false)
    })

    it('only includes visible sublayers in sublayers items', () => {
      const { items } = datasetRegistry.keyItems()
      const landCoversItem = items.find(item => item.type === 'sublayers' && item.dataset.id === 'land-covers')
      const sublayerIds = landCoversItem.sublayers.map(s => s.id)
      expect(sublayerIds).not.toContain('land-covers-379') // land-covers-379 has visible: false
    })

    it('includes a group entry for datasets sharing a groupLabel', () => {
      const { mappedDatasets: grouped } = mappedDatasetsReducer({ datasets: datasetsWithGroups })
      datasetRegistry.attach(grouped)
      const { items } = datasetRegistry.keyItems()
      const groupItems = items.filter(item => item.type === 'group')
      expect(groupItems).toHaveLength(1)
      expect(groupItems[0].groupLabel).toBe('Test group')
    })

    it('only adds one group entry per unique groupLabel', () => {
      const { mappedDatasets: grouped } = mappedDatasetsReducer({ datasets: datasetsWithGroups })
      datasetRegistry.attach(grouped)
      const { items } = datasetRegistry.keyItems()
      const groupLabels = items.filter(i => i.type === 'group').map(i => i.groupLabel)
      expect(groupLabels.length).toBe(new Set(groupLabels).size)
    })

    it('populates group item datasets with matching showInKey datasets', () => {
      const { mappedDatasets: grouped } = mappedDatasetsReducer({ datasets: datasetsWithGroups })
      datasetRegistry.attach(grouped)
      const { items } = datasetRegistry.keyItems()
      const groupItem = items.find(item => item.type === 'group' && item.groupLabel === 'Test group')
      const ids = groupItem.datasets.map(d => d.id)
      expect(ids).toContain('existing-fields')
      expect(ids).toContain('hedge-control')
    })

    it('caches the result when datasets ref has not changed', () => {
      const result1 = datasetRegistry.keyItems()
      const result2 = datasetRegistry.keyItems()
      expect(result1).toBe(result2)
    })

    it('recomputes when the datasets ref changes', () => {
      const result1 = datasetRegistry.keyItems()
      datasetRegistry.attach({ simple: { id: 'simple', showInKey: true, visible: true, style: {} } })
      const result2 = datasetRegistry.keyItems()
      expect(result1).not.toBe(result2)
    })
  })

  describe('attachCreateDataset', () => {
    let originalCreateDataset

    beforeEach(() => {
      originalCreateDataset = datasetRegistry._createDataset
    })

    afterEach(() => {
      datasetRegistry._createDataset = originalCreateDataset
    })

    it('overrides the factory used by getDataset', () => {
      const customFactory = jest.fn((def) => new Dataset(def))
      datasetRegistry.attachCreateDataset(customFactory)
      datasetRegistry.getDataset('land-covers')
      expect(customFactory).toHaveBeenCalled()
    })

    it('uses the return value of the custom factory', () => {
      const sentinel = { id: 'sentinel' }
      datasetRegistry.attachCreateDataset(() => sentinel)
      const result = datasetRegistry.getDataset('land-covers')
      expect(result).toBe(sentinel)
    })
  })

  describe('avoid recreating Dataset instances', () => {
    // Because the registryDataset instances are pure and immutable wrappers
    // around the dataset definition, we can return the same registryDataset
    // instances as long as the definitions are the same.
    // Avoiding unnecessary re-calculation of registryDataset instance members
    // like patternConfigs and symbolConfigs which are derived from the definition.
    const createDatasetSpy = jest.spyOn(datasetRegistry, '_createDataset')

    it("doesn't throw invalidating before caching anything", () => {
      expect(() => {
        datasetRegistry.attach({
          ...datasetRegistry.datasets,
          'land-covers-130-131': { id: 'land-covers-130-131', style: { stroke: '#00ff00' } }
        })
      }).not.toThrow()
    })

    it("doesn't throw if a sublayer without a valid parent is attached", () => {
      expect(() => {
        datasetRegistry.attach({
          ...datasetRegistry.datasets,
          'no-parent': { id: 'no-parent', parentId: 'no-exists', style: {} }

        })
        datasetRegistry.getDataset('no-parent')
        datasetRegistry.attach({
          ...datasetRegistry.datasets,
          'no-parent': { id: 'no-parent', parentId: 'no-exists', style: {} }
        })
      }).not.toThrow()
    })

    it('returns the same Dataset instance for the same dataset definition', () => {
      expect(datasetRegistry.getDataset('land-covers'))
        .toBe(datasetRegistry.getDataset('land-covers'))
      expect(createDatasetSpy).toHaveBeenCalledTimes(1)
    })

    it('removes cached Dataset instances when new datasets definition are attached', () => {
      const landCovers1 = datasetRegistry.getDataset('land-covers') // createDatasetSpy called once
      const landCovers1Definition = landCovers1._datasetDefinition
      // attach new definitions, with a different land-covers definition
      datasetRegistry.attach({ ...datasetRegistry.datasets, 'land-covers': { id: 'land-covers', style: {} } })

      expect(datasetRegistry.getDataset('land-covers')).not.toBe(landCovers1) // should be different as the definition has changed
      expect(createDatasetSpy).toHaveBeenCalledTimes(2)
      // ensure the old definition is no longer cached - which could cause a memory leak
      expect(datasetRegistry._definitionCache.getByDefinition(landCovers1Definition)).toBeUndefined()
    })

    it('should invalidate the cache of sublayers(children) when a parent dataset definition is updated', () => {
      const landCovers = datasetRegistry.getDataset('land-covers')
      const landCoversSublayer = datasetRegistry.getDataset('land-covers-130-131')
      expect(createDatasetSpy).toHaveBeenCalledTimes(2)
      const landCoversDefinition = landCovers._datasetDefinition

      // Update the parent dataset definition, which should invalidate both the parent and sublayer cache entries
      const newLandCoversDefinition = { ...landCoversDefinition, style: { stroke: '#00ff00' } }
      datasetRegistry.attach({ ...datasetRegistry.datasets, 'land-covers': newLandCoversDefinition })

      expect(datasetRegistry.getDataset('land-covers')).not.toBe(landCovers)
      expect(datasetRegistry.getDataset('land-covers-130-131')).not.toBe(landCoversSublayer)
      expect(createDatasetSpy).toHaveBeenCalledTimes(4)
    })

    it('should invalidate the cache of the parent and siblings when a sublayers dataset definition is updated', () => {
      const landCovers = datasetRegistry.getDataset('land-covers')
      const landCoversSublayer130 = datasetRegistry.getDataset('land-covers-130-131')
      const landCoversSublayer332 = datasetRegistry.getDataset('land-covers-332')
      expect(createDatasetSpy).toHaveBeenCalledTimes(3)
      const sublayerDefinition = landCoversSublayer130._datasetDefinition

      // Update the parent dataset definition, which should invalidate both the parent and sublayer cache entries
      const newSublayerDefinition = { ...sublayerDefinition, style: { stroke: '#00ff00' } }
      datasetRegistry.attach({ ...datasetRegistry.datasets, 'land-covers-130-131': newSublayerDefinition })

      expect(datasetRegistry.getDataset('land-covers')).not.toBe(landCovers)
      expect(datasetRegistry.getDataset('land-covers-130-131')).not.toBe(landCoversSublayer130)
      expect(datasetRegistry.getDataset('land-covers-332')).not.toBe(landCoversSublayer332)

      expect(createDatasetSpy).toHaveBeenCalledTimes(6)
    })

    it('should not invalidate the cache of different datasets when a definition is updated', () => {
      const landCovers = datasetRegistry.getDataset('land-covers')
      const existingFields = datasetRegistry.getDataset('existing-fields')
      expect(createDatasetSpy).toHaveBeenCalledTimes(2)
      const existingFieldsDefinition = existingFields._datasetDefinition

      // Update existing-fields, which should not invalidate land-covers
      const newExistingFieldsDefinition = { id: 'existing-fields', style: {} }
      datasetRegistry.attach({ ...datasetRegistry.datasets, 'existing-fields': newExistingFieldsDefinition })

      expect(datasetRegistry.getDataset('land-covers')).toBe(landCovers)
      expect(datasetRegistry.getDataset('existing-fields')).not.toBe(existingFields)
      expect(createDatasetSpy).toHaveBeenCalledTimes(3) // should have been called one more time
      expect(datasetRegistry._definitionCache.getByDefinition(existingFieldsDefinition)).toBeUndefined() // old definition should no longer be cached
    })
  })
})
