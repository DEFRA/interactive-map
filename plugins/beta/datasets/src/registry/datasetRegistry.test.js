import { Dataset } from './dataset.js'
import { datasetRegistry } from './datasetRegistry.js'
import { mappedDatasetsReducer } from '../reducers/mappedDatasetsReducer.js'
import { datasets as datasetDefinitions, datasetsWithGroups } from '../reducers/__data__/demoDatasets.js'
// Use the mock datasetRegistry with the demo datasets attached before each test.
// Dataset must be imported before datasetRegistry so that dataset.js is cached before
// the mock initialization triggers requireActual, avoiding a circular re-entry that
// would leave datasetRegistry undefined inside the mock.
jest.mock('./datasetRegistry.js')

const { mappedDatasets, orderedDatasets } = mappedDatasetsReducer({ datasets: datasetDefinitions })

describe('datasetRegistry', () => {
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
    beforeEach(() => {
      datasetRegistry.attach(mappedDatasets, orderedDatasets)
    })

    it('calls the callback once per dataset in orderedDatasets order', () => {
      const ids = []
      datasetRegistry.forEach(dataset => ids.push(dataset.id))
      expect(ids).toEqual(orderedDatasets)
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
      originalCreateDataset = datasetRegistry.createDataset
    })

    afterEach(() => {
      datasetRegistry.createDataset = originalCreateDataset
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
})
