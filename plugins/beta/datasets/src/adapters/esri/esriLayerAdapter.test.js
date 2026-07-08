import { EsriDataset } from './registry/esriDataset.js'
import EsriLayerAdapter from './esriLayerAdapter.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'

jest.mock('../../registry/datasetRegistry.js')
jest.mock('@arcgis/core/layers/VectorTileLayer.js', () =>
  jest.fn().mockImplementation((opts = {}) => ({
    ...opts,
    add: jest.fn(),
    when: jest.fn().mockResolvedValue(undefined),
    setStyleLayerVisibility: jest.fn(),
    getPaintProperties: jest.fn().mockReturnValue({}),
    setPaintProperties: jest.fn()
  }))
)
jest.mock('@arcgis/core/layers/GroupLayer.js', () =>
  jest.fn().mockImplementation((opts = {}) => ({
    ...opts,
    add: jest.fn()
  }))
)

// Uncovered: 80-88,124,145-149

const MAP_STYLE = { id: 'outdoor' }
const makeMap = () => {
  const _added = {}
  return {
    add: jest.fn(({ id }) => {
      // Ensure that the same layer is never added twice
      expect(_added[id]).toBeUndefined()
      _added[id] = true
    })
  }
}
const makeMapProvider = (map) => ({ map })

describe('esriLayerAdapter', () => {
  let map, mapProvider, adapter

  beforeEach(() => {
    datasetRegistry.useEsriDatasets()
    datasetRegistry.attachMapStyle(MAP_STYLE)
    datasetRegistry.attachCreateDataset(def => new EsriDataset(def))
    map = makeMap()
    mapProvider = makeMapProvider(map)
    adapter = new EsriLayerAdapter(mapProvider, null, null)
  })

  // ─── createDataset ───────────────────────────────────────────────────────────

  describe('createDataset', () => {
    it('returns an EsriDataset instance', () => {
      expect(adapter.createDataset({ id: 'test' })).toBeInstanceOf(EsriDataset)
    })
  })

  // ─── applyDatasetVisibility ──────────────────────────────────────────────────

  describe('applyDatasetVisibility', () => {
    beforeEach(async () => {
      const standAlone = datasetRegistry.getDataset('esri-standalone')
      await adapter._addLayers(standAlone, MAP_STYLE)
    })

    it('applies visibility for a known dataset', async () => {
      await adapter.applyDatasetVisibility('esri-standalone')
      expect(adapter._vectorTileLayers['esri-standalone'].visible).toBe(true)
    })

    it('does nothing for an unknown dataset', async () => {
      await expect(adapter.applyDatasetVisibility('unknown')).resolves.not.toThrow()
    })
  })

  // ─── applyDatasetOpacity ─────────────────────────────────────────────────────

  describe('applyDatasetOpacity', () => {
    it('sets opacity on the opacity layer for a known dataset', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'), MAP_STYLE)
      await adapter.applyDatasetOpacity('esri-standalone')
      expect(adapter._vectorTileOpacityLayers['esri-standalone'].opacity)
        .toBe(datasetRegistry.getDataset('esri-standalone').opacity)
    })

    it('does nothing when the dataset has no opacity layer', async () => {
      await expect(adapter.applyDatasetOpacity('esri-standalone')).resolves.not.toThrow()
    })

    it('does nothing for an unknown dataset', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'), MAP_STYLE)
      await expect(adapter.applyDatasetOpacity('unknown')).resolves.not.toThrow()
    })
  })

  // ─── applyGlobalOpacity ──────────────────────────────────────────────────────

  describe('applyGlobalOpacity', () => {
    it('sets opacity on all opacity layers', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'), MAP_STYLE)
      await adapter.applyGlobalOpacity()
      expect(adapter._vectorTileOpacityLayers['esri-standalone'].opacity)
        .toBe(datasetRegistry.getDataset('esri-standalone').opacity)
    })

    it('skips entries whose dataset is not in the registry', async () => {
      adapter._vectorTileOpacityLayers['ghost-id'] = { opacity: 99 }
      await expect(adapter.applyGlobalOpacity()).resolves.not.toThrow()
      expect(adapter._vectorTileOpacityLayers['ghost-id'].opacity).toBe(99)
    })
  })

  // ─── onMapStyleChange ────────────────────────────────────────────────────────

  describe('onMapStyleChange', () => {
    beforeEach(async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'), MAP_STYLE)
      await adapter._addLayers(datasetRegistry.getDataset('esri-server'), MAP_STYLE)
    })

    it('calls setStyleLayerVisibility for datasets with esriStyleLayerId', async () => {
      await adapter.onMapStyleChange(MAP_STYLE, null)
      expect(adapter._vectorTileLayers['esri-standalone'].setStyleLayerVisibility)
        .toHaveBeenCalledWith('standalone-style', expect.any(String))
    })

    it('calls setPaintProperties for datasets not using server style', async () => {
      await adapter.onMapStyleChange(MAP_STYLE, null)
      expect(adapter._vectorTileLayers['esri-standalone'].setPaintProperties)
        .toHaveBeenCalledWith('standalone-style', expect.any(Object))
    })

    it('does not call setPaintProperties when useServerStyle is true', async () => {
      await adapter.onMapStyleChange(MAP_STYLE, null)
      expect(adapter._vectorTileLayers['esri-server'].setPaintProperties).not.toHaveBeenCalled()
    })

    // it('does not call setPaintProperties when getPaintProperties returns null', async () => {
    //   const vtl = adapter._vectorTileLayers['esri-standalone']
    //   vtl.getPaintProperties.mockReturnValueOnce(null)
    //   await adapter.onMapStyleChange(MAP_STYLE, null)
    //   expect(vtl.setPaintProperties).not.toHaveBeenCalled()
    // })
  })

  // ─── init ────────────────────────────────────────────────────────────────────

  describe('init', () => {
    beforeEach(async () => {
      await adapter.init()
    })

    it('adds VectorTileLayers for all top-level datasets', async () => {
      expect(adapter._vectorTileLayers['flood-zones-cc']).toBeDefined()
      expect(adapter._vectorTileLayers['flood-zones']).toBeDefined()
    })

    it('applies dataset visibility after adding layers', async () => {
      expect(adapter._groupLayers['flood-zones-group'].visible).toBe(true)
      expect(adapter._vectorTileLayers['flood-zones-cc'].visible).toBe(true)
      expect(adapter._vectorTileLayers['flood-zones'].visible).toBe(false)
    })

    it('adds GroupLayers for datasets with esriGroupId', async () => {
      expect(map.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'flood-zones-group' }))
    })

    it('calls map.add for each top-level dataset', async () => {
      expect(map.add.mock.calls.length).toEqual(5) // 3 top-level datasets + 2 group layers
    })
  })

  // ─── onMapSizeChange ─────────────────────────────────────────────────────────

  describe('onMapSizeChange', () => {
    it('resolves without doing anything', async () => {
      await expect(adapter.onMapSizeChange()).resolves.toBeUndefined()
    })
  })
})
