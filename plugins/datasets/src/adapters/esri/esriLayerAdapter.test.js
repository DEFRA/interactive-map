import { EsriDataset } from './registry/esriDataset.js'
import EsriLayerAdapter from './esriLayerAdapter.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'

jest.mock('../../registry/datasetRegistry.js')
jest.mock('../../../../../src/services/logger.js')

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
  jest.fn().mockImplementation((opts = {}) => {
    const layers = []
    return {
      ...opts,
      layers,
      add: jest.fn(layer => layers.push(layer)),
      remove: jest.fn(layer => {
        const idx = layers.indexOf(layer)
        if (idx !== -1) layers.splice(idx, 1)
      })
    }
  })
)
jest.mock('@arcgis/core/layers/FeatureLayer.js', () =>
  jest.fn().mockImplementation((opts = {}) => ({
    ...opts,
    when: jest.fn().mockResolvedValue(undefined)
  }))
)

// Uncovered: 124,145-149

const MAP_STYLE = { id: 'outdoor' }
const makeMap = () => {
  const _added = {}
  return {
    add: jest.fn(({ id }) => {
      // Ensure that the same layer is never added twice
      expect(_added[id]).toBeUndefined()
      _added[id] = true
    }),
    remove: jest.fn()
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
    adapter.resolveReady()
  })

  // ─── createDataset ───────────────────────────────────────────────────────────

  describe('createDataset', () => {
    it('returns an EsriDataset instance', () => {
      expect(adapter.createDataset({ id: 'test' })).toBeInstanceOf(EsriDataset)
    })
  })

  // ─── addDataset ──────────────────────────────────────────────────────────────

  describe('addDataset', () => {
    it('copes and returns when the dataset is not in the registry', async () => {
      await adapter.addDataset('unknown')
      expect(adapter._mapVisibilityLayers.unknown).toBeUndefined()
    })

    it('adds a standalone dataset to the map and populates internal state', async () => {
      await adapter.addDataset('esri-standalone')
      expect(adapter._mapVisibilityLayers['esri-standalone']).toBeDefined()
      expect(adapter._mapOpacityLayers['esri-standalone']).toBeDefined()
    })

    it('applies opacity and visibility after adding layers', async () => {
      await adapter.addDataset('esri-standalone')
      const vtl = adapter._mapVisibilityLayers['esri-standalone']
      expect(vtl.visible).toBe(true)
      expect(adapter._mapOpacityLayers['esri-standalone'].opacity)
        .toBe(datasetRegistry.getDataset('esri-standalone').opacity)
    })

    it('applies paint properties for datasets with esriStyleLayerId', async () => {
      await adapter.addDataset('esri-standalone')
      const vtl = adapter._mapVisibilityLayers['esri-standalone']
      expect(vtl.setPaintProperties).toHaveBeenCalledWith('standalone-style', expect.any(Object))
    })

    it('does not apply paint properties for server-style datasets', async () => {
      await adapter.addDataset('esri-server')
      const vtl = adapter._mapVisibilityLayers['esri-server']
      expect(vtl.setPaintProperties).not.toHaveBeenCalled()
    })

    it('creates a group layer when adding a grouped dataset', async () => {
      await adapter.addDataset('esri-grouped')
      expect(adapter._mapVisibilityLayers['esri-grouped']).toBeDefined()
      expect(adapter._groupLayers['my-group']).toBeDefined()
    })
  })

  // ─── removeDataset ────────────────────────────────────────────────────────────

  describe('removeDataset', () => {
    it('does nothing when dataset is not in the registry', async () => {
      await expect(adapter.removeDataset('unknown')).resolves.toBeUndefined()
      expect(map.remove).not.toHaveBeenCalled()
    })

    it('does nothing when the dataset has not been added to the adapter', async () => {
      await adapter.removeDataset('esri-standalone')
      expect(map.remove).not.toHaveBeenCalled()
    })

    it('removes a standalone vectorTileLayer from the map and clears internal state', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'))
      const vtl = adapter._mapVisibilityLayers['esri-standalone']
      await adapter.removeDataset('esri-standalone')
      expect(map.remove).toHaveBeenCalledWith(vtl)
      expect(adapter._mapVisibilityLayers['esri-standalone']).toBeUndefined()
      expect(adapter._mapOpacityLayers['esri-standalone']).toBeUndefined()
    })

    it('removes the vectorTileLayer from its group layer but keeps the group when other layers remain', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('flood-zones-cc'))
      await adapter._addLayers(datasetRegistry.getDataset('flood-zones'))
      const vtl = adapter._mapVisibilityLayers['flood-zones-cc']
      const groupLayer = adapter._groupLayers['flood-zones-group']
      await adapter.removeDataset('flood-zones-cc')
      expect(groupLayer.remove).toHaveBeenCalledWith(vtl)
      expect(map.remove).not.toHaveBeenCalledWith(groupLayer)
      expect(adapter._groupLayers['flood-zones-group']).toBeDefined()
      expect(adapter._mapVisibilityLayers['flood-zones-cc']).toBeUndefined()
      expect(adapter._mapOpacityLayers['flood-zones-cc']).toBeUndefined()
    })

    it('removes the group layer from the map when its last vectorTileLayer is removed', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-grouped'))
      const vtl = adapter._mapVisibilityLayers['esri-grouped']
      const groupLayer = adapter._groupLayers['my-group']
      await adapter.removeDataset('esri-grouped')
      expect(groupLayer.remove).toHaveBeenCalledWith(vtl)
      expect(map.remove).toHaveBeenCalledWith(groupLayer)
      expect(adapter._groupLayers['my-group']).toBeUndefined()
      expect(adapter._mapVisibilityLayers['esri-grouped']).toBeUndefined()
      expect(adapter._mapOpacityLayers['esri-grouped']).toBeUndefined()
    })
  })

  // ─── applyDatasetVisibility ──────────────────────────────────────────────────

  describe('applyDatasetVisibility', () => {
    beforeEach(async () => {
      const standAlone = datasetRegistry.getDataset('esri-standalone')
      await adapter._addLayers(standAlone)
    })

    it('applies visibility for a known dataset', async () => {
      await adapter.applyDatasetVisibility('esri-standalone')
      expect(adapter._mapVisibilityLayers['esri-standalone'].visible).toBe(true)
    })

    it('does nothing for an unknown dataset', async () => {
      await expect(adapter.applyDatasetVisibility('unknown')).resolves.not.toThrow()
    })

    it('calls setStyleLayerVisibility for datasets with esriStyleLayerId', async () => {
      const applyStyleLayerVisibilitySpy = jest.spyOn(adapter, '_applyStyleLayerVisibility')
      await adapter._addLayers(datasetRegistry.getDataset('flood-zones'))
      await adapter.applyDatasetVisibility('flood-zones-flood-zone-3')
      expect(applyStyleLayerVisibilitySpy.mock.calls).toHaveLength(1)
    })
  })

  // ─── applyDatasetOpacity ─────────────────────────────────────────────────────

  describe('applyDatasetOpacity', () => {
    it('sets opacity on the opacity layer for a known dataset', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'))
      await adapter.applyDatasetOpacity('esri-standalone')
      expect(adapter._mapOpacityLayers['esri-standalone'].opacity)
        .toBe(datasetRegistry.getDataset('esri-standalone').opacity)
    })

    it('does nothing when the dataset has no opacity layer', async () => {
      await expect(adapter.applyDatasetOpacity('esri-standalone')).resolves.not.toThrow()
    })

    it('does nothing for an unknown dataset', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'))
      await expect(adapter.applyDatasetOpacity('unknown')).resolves.not.toThrow()
    })
  })

  // ─── applyGlobalOpacity ──────────────────────────────────────────────────────

  describe('applyGlobalOpacity', () => {
    it('sets opacity on all opacity layers', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'))
      await adapter.applyGlobalOpacity()
      expect(adapter._mapOpacityLayers['esri-standalone'].opacity)
        .toBe(datasetRegistry.getDataset('esri-standalone').opacity)
    })

    it('skips entries whose dataset is not in the registry', async () => {
      adapter._mapOpacityLayers['ghost-id'] = { opacity: 99 }
      await expect(adapter.applyGlobalOpacity()).resolves.not.toThrow()
      expect(adapter._mapOpacityLayers['ghost-id'].opacity).toBe(99)
    })
  })

  // ─── onMapStyleChange ────────────────────────────────────────────────────────

  describe('onMapStyleChange', () => {
    beforeEach(async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'))
      await adapter._addLayers(datasetRegistry.getDataset('esri-server'))
    })

    it('calls setStyleLayerVisibility for datasets with esriStyleLayerId', async () => {
      await adapter.onMapStyleChange()
      expect(adapter._mapVisibilityLayers['esri-standalone'].setStyleLayerVisibility)
        .toHaveBeenCalledWith('standalone-style', expect.any(String))
    })

    it('calls setPaintProperties for datasets not using server style', async () => {
      await adapter.onMapStyleChange()
      expect(adapter._mapVisibilityLayers['esri-standalone'].setPaintProperties)
        .toHaveBeenCalledWith('standalone-style', expect.any(Object))
    })

    it('does not call setPaintProperties when useServerStyle is true', async () => {
      await adapter.onMapStyleChange()
      expect(adapter._mapVisibilityLayers['esri-server'].setPaintProperties).not.toHaveBeenCalled()
    })
  })

  // ─── init ────────────────────────────────────────────────────────────────────

  describe('init', () => {
    beforeEach(async () => {
      await adapter.init()
    })

    it('adds VectorTileLayers for all top-level datasets', async () => {
      expect(adapter._mapVisibilityLayers['flood-zones-cc']).toBeDefined()
      expect(adapter._mapVisibilityLayers['flood-zones']).toBeDefined()
    })

    it('applies dataset visibility after adding layers', async () => {
      expect(adapter._groupLayers['flood-zones-group'].visible).toBe(true)
      expect(adapter._mapVisibilityLayers['flood-zones-cc'].visible).toBe(true)
      expect(adapter._mapVisibilityLayers['flood-zones'].visible).toBe(false)
    })

    it('adds GroupLayers for datasets with esriGroupId', async () => {
      expect(map.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'flood-zones-group' }))
    })

    it('calls map.add for each top-level dataset', async () => {
      expect(map.add.mock.calls).toHaveLength(5) // 3 top-level datasets + 2 group layers
    })
  })

  // ─── onMapSizeChange ─────────────────────────────────────────────────────────

  describe('onMapSizeChange', () => {
    it('resolves without doing anything', async () => {
      await expect(adapter.onMapSizeChange()).resolves.toBeUndefined()
    })
  })

  describe('applyGlobalVisibility', () => {
    beforeEach(async () => {
      await adapter.init()
    })

    it('applies visibility for all datasets', async () => {
      const applyStyleLayerVisibilitySpy = jest.spyOn(adapter, '_applyStyleLayerVisibility')
      await adapter.applyGlobalVisibility()
      expect(applyStyleLayerVisibilitySpy.mock.calls).toHaveLength(7)
    })
  })

  // ─── _reorderLayers with sketch layers ───────────────────────────────────────

  describe('_reorderLayers', () => {
    it('reorders sketch layers to the top when allLayers is present', () => {
      const sketchLayer = { id: 'ketchLayer-0' }
      const normalLayer = { id: 'roads' }
      map.allLayers = { items: [normalLayer, sketchLayer] }
      map.reorder = jest.fn()

      adapter._reorderLayers()

      expect(map.reorder).toHaveBeenCalledWith(sketchLayer, 2)
      expect(map.reorder).not.toHaveBeenCalledWith(normalLayer, expect.anything())
    })
  })

  // ─── _addFeatureLayers ────────────────────────────────────────────────────────

  describe('_addFeatureLayers', () => {
    beforeEach(() => {
      datasetRegistry.mockExtend({
        'feature-service': {
          id: 'feature-service',
          type: 'FeatureService',
          tiles: 'https://example.com/featureserver/0',
          visible: true,
          style: {}
        }
      })
    })

    it('adds a FeatureLayer to the map and populates internal state', async () => {
      const dataset = datasetRegistry.getDataset('feature-service')
      await adapter._addFeatureLayers(dataset)
      expect(adapter._mapVisibilityLayers['feature-service']).toBeDefined()
      expect(adapter._mapOpacityLayers['feature-service']).toBeDefined()
      expect(map.add).toHaveBeenCalled()
    })

    it('logs an error and returns null when map.add throws', async () => {
      const { logger } = require('../../../../../src/services/logger.js')
      const error = new Error('map add failed')
      map.add = jest.fn().mockImplementation(() => { throw error })

      const dataset = datasetRegistry.getDataset('feature-service')
      const result = await adapter._addFeatureLayers(dataset)

      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('feature-service'), error)
      expect(result).toBeNull()
    })
  })

  // ─── _addLayers for FeatureService ───────────────────────────────────────────

  describe('_addLayers for FeatureService type', () => {
    it('delegates to _addFeatureLayers when dataset type is FeatureService', async () => {
      datasetRegistry.mockExtend({
        'fs-dataset': {
          id: 'fs-dataset',
          type: 'FeatureService',
          tiles: 'https://example.com/fs/0',
          visible: true,
          style: {}
        }
      })
      const addFeatureLayersSpy = jest.spyOn(adapter, '_addFeatureLayers')
      const dataset = datasetRegistry.getDataset('fs-dataset')
      await adapter._addLayers(dataset)
      expect(addFeatureLayersSpy).toHaveBeenCalledWith(dataset)
    })
  })

  // ─── _applyRegistryDatasetVisibility – visible=false branch ──────────────────

  describe('_applyRegistryDatasetVisibility visible=false', () => {
    it('sets vectorTileLayer.visible to false and skips sublayer style update', async () => {
      const dataset = datasetRegistry.getDataset('esri-grouped')
      await adapter._addLayers(dataset)
      await adapter._applyRegistryDatasetVisibility(dataset)
      expect(adapter._mapVisibilityLayers['esri-grouped'].visible).toBe(false)
    })

    it('returns early when the vector tile layer is not yet in the adapter', () => {
      const dataset = datasetRegistry.getDataset('esri-standalone')
      // No layers added — _mapVisibilityLayers is empty
      expect(() => adapter._applyRegistryDatasetVisibility(dataset)).not.toThrow()
    })
  })

  // ─── _addLayers – no tiles ────────────────────────────────────────────────────

  describe('_addLayers with no tiles', () => {
    it('returns null when the dataset has no tiles', async () => {
      datasetRegistry.mockExtend({
        'no-tiles': { id: 'no-tiles', visible: true, style: {} }
      })
      const result = await adapter._addLayers(datasetRegistry.getDataset('no-tiles'))
      expect(result).toBeNull()
    })
  })

  // ─── stub methods ─────────────────────────────────────────────────────────────

  describe('stub adapter methods', () => {
    it('applyFeatureFilter logs and resolves', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      await adapter.applyFeatureFilter('roads')
      expect(consoleSpy).toHaveBeenCalledWith('TODO: applyFeatureFilter', ['roads'])
      consoleSpy.mockRestore()
    })

    it('setData logs and resolves', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      await adapter.setData('roads', {})
      expect(consoleSpy).toHaveBeenCalledWith('TODO: setData', ['roads', {}])
      consoleSpy.mockRestore()
    })

    it('applyStyle logs and resolves', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      await adapter.applyStyle('roads', {})
      expect(consoleSpy).toHaveBeenCalledWith('TODO: applyStyle', ['roads', {}])
      consoleSpy.mockRestore()
    })
  })

  // ─── _applyStyleLayerPaintProperties – null paint properties ─────────────────

  describe('_applyStyleLayerPaintProperties', () => {
    it('does nothing when getPaintProperties returns null', async () => {
      await adapter._addLayers(datasetRegistry.getDataset('esri-standalone'))
      const vtl = adapter._mapVisibilityLayers['esri-standalone']
      vtl.getPaintProperties = jest.fn().mockReturnValue(null)

      adapter._applyStyleLayerPaintProperties(datasetRegistry.getDataset('esri-standalone'), vtl)

      expect(vtl.setPaintProperties).not.toHaveBeenCalled()
    })
  })

  // ─── onMapStyleChange for FeatureService ─────────────────────────────────────

  describe('onMapStyleChange for FeatureService', () => {
    it('sets renderer on FeatureLayer instead of applying style layer visibility', async () => {
      datasetRegistry.mockExtend({
        'fs-style': {
          id: 'fs-style',
          type: 'FeatureService',
          tiles: 'https://example.com/fs/0',
          visible: true,
          style: {}
        }
      })
      await adapter._addLayers(datasetRegistry.getDataset('fs-style'))
      const featureLayer = adapter._mapVisibilityLayers['fs-style']
      const setStyleLayerVisibilitySpy = jest.spyOn(adapter, '_applyStyleLayerVisibility')

      await adapter.onMapStyleChange()

      // The renderer property should be set (even if undefined for no-renderer datasets)
      expect(Object.prototype.hasOwnProperty.call(featureLayer, 'renderer')).toBe(true)
      // _applyStyleLayerVisibility should not be called for the FeatureService dataset
      const fsCall = setStyleLayerVisibilitySpy.mock.calls.find(
        ([ds]) => ds?.id === 'fs-style'
      )
      expect(fsCall).toBeUndefined()
    })
  })
})
