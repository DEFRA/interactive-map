import MaplibreLayerAdapter from './maplibreLayerAdapter'

import { applyExclusionFilter } from '../../utils/filters.js'
import { getSourceId, getLayerIds, getSublayerLayerIds, getAllLayerIds } from './layerIds.js'
import { addDatasetLayers, addSublayerLayers } from './layerBuilders.js'
import { getPatternConfigs, hasPattern, getPatternImageId } from './patternImages.js'
import { getSymbolConfigs, getSymbolImageId } from './symbolImages.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'

// ─── Module mocks ─────────────────────────────────────────────────────────────

jest.mock('../../utils/filters.js', () => ({
  applyExclusionFilter: jest.fn()
}))

jest.mock('./layerIds.js', () => ({
  getSourceId: jest.fn((ds) => `source-${ds.id}`),
  getLayerIds: jest.fn(() => ({ fillLayerId: 'ds-fill', strokeLayerId: 'ds-stroke', symbolLayerId: null })),
  getSublayerLayerIds: jest.fn((dsId, slId) => ({
    fillLayerId: `${dsId}-${slId}`,
    strokeLayerId: `${dsId}-${slId}-stroke`,
    symbolLayerId: `${dsId}-${slId}-symbol`
  })),
  getAllLayerIds: jest.fn(() => ['ds-fill', 'ds-stroke'])
}))

jest.mock('./layerBuilders.js', () => ({
  addDatasetLayers: jest.fn(() => 'source-ds'),
  addSublayerLayers: jest.fn()
}))

jest.mock('./patternImages.js', () => ({
  getPatternConfigs: jest.fn(() => []),
  hasPattern: jest.fn(() => false),
  getPatternImageId: jest.fn(() => null)
}))

jest.mock('./symbolImages.js', () => ({
  getSymbolConfigs: jest.fn(() => []),
  getSymbolImageId: jest.fn(() => null)
}))

jest.mock('../../utils/mergeSublayer.js', () => ({
  mergeSublayer: jest.fn((ds, sl) => ({ ...ds, ...sl }))
}))

jest.mock('../../../../../../src/config/appConfig.js', () => ({
  scaleFactor: { small: 0.5, large: 2 }
}))

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeMap = (layerMap = {}, styleOverride = null) => {
  const layers = Object.entries(layerMap).map(([id, type]) => ({ id, type, source: `source-${id}` }))
  return {
    getLayer: jest.fn((id) => layerMap[id] ? { id, type: layerMap[id] } : undefined),
    getSource: jest.fn(() => ({ setData: jest.fn() })),
    addSource: jest.fn(),
    removeSource: jest.fn(),
    addLayer: jest.fn(),
    removeLayer: jest.fn(),
    setLayoutProperty: jest.fn(),
    setPaintProperty: jest.fn(),
    moveLayer: jest.fn(),
    once: jest.fn((event, cb) => cb()),
    getStyle: jest.fn(() => styleOverride ?? { layers }),
    getPixelRatio: jest.fn(() => 1)
  }
}

const makeMapProvider = (map, mapSize = 'medium') => ({
  map,
  mapSize,
  registerPatterns: jest.fn(() => Promise.resolve()),
  registerSymbols: jest.fn(() => Promise.resolve())
})

const makeAdapter = (mapOptions = {}, mapSize = 'medium') => {
  const map = makeMap(mapOptions)
  const mapProvider = makeMapProvider(map, mapSize)
  const symbolRegistry = { resolve: jest.fn() }
  const patternRegistry = {}
  const adapter = new MaplibreLayerAdapter(mapProvider, symbolRegistry, patternRegistry)
  return { adapter, map, mapProvider, symbolRegistry, patternRegistry }
}

const dataset = { id: 'ds', fill: 'blue', stroke: 'red', visibility: 'visible' }
const mapStyle = { id: 'default' }

beforeEach(() => {
  jest.clearAllMocks()
  getAllLayerIds.mockReturnValue(['ds-fill', 'ds-stroke'])
  getLayerIds.mockReturnValue({ fillLayerId: 'ds-fill', strokeLayerId: 'ds-stroke', symbolLayerId: null })
  getSublayerLayerIds.mockImplementation((dsId, slId) => ({
    fillLayerId: `${dsId}-${slId}`,
    strokeLayerId: `${dsId}-${slId}-stroke`,
    symbolLayerId: `${dsId}-${slId}-symbol`
  }))
  getSourceId.mockImplementation((ds) => `source-${ds.id}`)
  addDatasetLayers.mockReturnValue('source-ds')
  hasPattern.mockReturnValue(false)
  getSymbolImageId.mockReturnValue(null)
  getPatternImageId.mockReturnValue(null)
})

// ─── constructor ──────────────────────────────────────────────────────────────

describe('constructor', () => {
  it('stores the map reference from the provider', () => {
    const { adapter, map } = makeAdapter()
    expect(adapter._map).toBe(map)
  })

  it('initialises an empty datasetSourceMap', () => {
    const { adapter } = makeAdapter()
    expect(adapter._datasetSourceMap.size).toBe(0)
  })
})

// ─── init ─────────────────────────────────────────────────────────────────────

describe('init', () => {
  it('registers patterns and symbols before adding layers', async () => {
    const { adapter, mapProvider } = makeAdapter()
    await adapter.init([dataset], mapStyle)
    expect(mapProvider.registerPatterns).toHaveBeenCalled()
    expect(mapProvider.registerSymbols).toHaveBeenCalled()
  })

  it('calls addDatasetLayers for each dataset', async () => {
    const { adapter } = makeAdapter()
    await adapter.init([dataset], mapStyle)
    expect(addDatasetLayers).toHaveBeenCalledWith(
      adapter._map, dataset, mapStyle, adapter._symbolRegistry, adapter._patternRegistry, expect.any(Number)
    )
  })

  it('waits for the map idle event', async () => {
    const { adapter, map } = makeAdapter()
    await adapter.init([dataset], mapStyle)
    expect(map.once).toHaveBeenCalledWith('idle', expect.any(Function))
  })

  it('records the sourceId in the datasetSourceMap', async () => {
    const { adapter } = makeAdapter()
    await adapter.init([dataset], mapStyle)
    expect(adapter._datasetSourceMap.get('ds')).toBe('source-ds')
  })
})

// ─── destroy ──────────────────────────────────────────────────────────────────

describe('destroy', () => {
  it('removes all layers for the dataset', async () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill', 'ds-stroke': 'line' })
    map.getStyle.mockReturnValue({
      layers: [
        { id: 'ds-fill', type: 'fill', source: 'source-ds' },
        { id: 'ds-stroke', type: 'line', source: 'source-ds' }
      ]
    })
    await adapter.init([dataset], mapStyle)
    adapter.destroy([dataset])
    expect(map.removeLayer).toHaveBeenCalledWith('ds-fill')
    expect(map.removeLayer).toHaveBeenCalledWith('ds-stroke')
  })

  it('removes the source after removing layers', async () => {
    const { adapter, map } = makeAdapter()
    getSourceId.mockReturnValue('source-ds')
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds-fill', source: 'source-ds' }] })
    await adapter.init([dataset], mapStyle)
    adapter.destroy([dataset])
    expect(map.removeSource).toHaveBeenCalledWith('source-ds')
  })

  it('clears the datasetSourceMap', async () => {
    const { adapter } = makeAdapter()
    await adapter.init([dataset], mapStyle)
    adapter.destroy([dataset])
    expect(adapter._datasetSourceMap.size).toBe(0)
  })

  it('does not remove layer if map does not have it', () => {
    const { adapter, map } = makeAdapter()
    map.getLayer.mockReturnValue(undefined)
    adapter.destroy([dataset])
    expect(map.removeLayer).not.toHaveBeenCalled()
  })
})

// ─── addDataset ───────────────────────────────────────────────────────────────

describe('addDataset', () => {
  it('calls addDatasetLayers and stores the sourceId', () => {
    const { adapter } = makeAdapter()
    adapter.addDataset(dataset, mapStyle)
    expect(addDatasetLayers).toHaveBeenCalled()
    expect(adapter._datasetSourceMap.get('ds')).toBe('source-ds')
  })
})

// ─── removeDataset ────────────────────────────────────────────────────────────

describe('removeDataset', () => {
  it('removes all layer ids returned by getAllLayerIds', () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill', 'ds-stroke': 'line' })
    adapter._datasetSourceMap.set('ds', 'source-ds')
    adapter.removeDataset(dataset, [dataset])
    expect(map.removeLayer).toHaveBeenCalledWith('ds-fill')
    expect(map.removeLayer).toHaveBeenCalledWith('ds-stroke')
  })

  it('removes the source when not shared', () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill' })
    adapter._datasetSourceMap.set('ds', 'source-ds')
    adapter.removeDataset(dataset, [dataset])
    expect(map.removeSource).toHaveBeenCalledWith('source-ds')
  })

  it('does not remove source when shared by another dataset', () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill' })
    const shared = { id: 'other' }
    getSourceId.mockReturnValue('source-ds')
    adapter._datasetSourceMap.set('ds', 'source-ds')
    adapter.removeDataset(dataset, [dataset, shared])
    expect(map.removeSource).not.toHaveBeenCalled()
  })

  it('deletes the dataset from datasetSourceMap', () => {
    const { adapter } = makeAdapter()
    adapter._datasetSourceMap.set('ds', 'source-ds')
    adapter.removeDataset(dataset, [])
    expect(adapter._datasetSourceMap.has('ds')).toBe(false)
  })
})

// ─── showDataset / hideDataset ────────────────────────────────────────────────

describe('showDataset', () => {
  it('sets visibility to visible on all matching layers', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({
      layers: [{ id: 'ds', type: 'fill' }, { id: 'ds-stroke', type: 'line' }]
    })
    adapter.showDataset('ds')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-stroke', 'visibility', 'visible')
  })

  it('does nothing when map style has no layers', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue(null)
    expect(() => adapter.showDataset('ds')).not.toThrow()
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })
})

describe('hideDataset', () => {
  it('sets visibility to none on all matching layers', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({
      layers: [{ id: 'ds', type: 'fill' }, { id: 'ds-stroke', type: 'line' }]
    })
    adapter.hideDataset('ds')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds', 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-stroke', 'visibility', 'none')
  })

  it('does not affect layers belonging to a different dataset', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({
      layers: [{ id: 'other', type: 'fill' }, { id: 'other-stroke', type: 'line' }]
    })
    adapter.hideDataset('ds')
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })
})

// ─── showSublayer / hideSublayer ──────────────────────────────────────────────

describe('showSublayer', () => {
  it('sets visibility to visible for all three sublayer layer ids that exist', () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill', 'ds-sl-stroke': 'line', 'ds-sl-symbol': 'symbol' })
    adapter.showSublayer('ds', 'sl')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-sl', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-sl-stroke', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-sl-symbol', 'visibility', 'visible')
  })

  it('skips layer ids that do not exist on the map', () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill' })
    adapter.showSublayer('ds', 'sl')
    expect(map.setLayoutProperty).toHaveBeenCalledTimes(1)
  })
})

describe('hideSublayer', () => {
  it('sets visibility to none for all three sublayer layer ids that exist', () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill', 'ds-sl-stroke': 'line' })
    adapter.hideSublayer('ds', 'sl')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-sl', 'visibility', 'none')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-sl-stroke', 'visibility', 'none')
  })
})

// ─── showFeatures / hideFeatures ──────────────────────────────────────────────

describe('showFeatures / hideFeatures', () => {
  it('showFeatures calls applyExclusionFilter with the remaining hidden ids', () => {
    const { adapter } = makeAdapter({ 'ds-fill': 'fill', 'ds-stroke': 'line' })
    adapter.showFeatures(dataset, 'id', [2, 3])
    expect(applyExclusionFilter).toHaveBeenCalled()
  })

  it('hideFeatures calls applyExclusionFilter with all hidden ids', () => {
    const { adapter } = makeAdapter({ 'ds-fill': 'fill', 'ds-stroke': 'line' })
    adapter.hideFeatures(dataset, 'id', [1, 2, 3])
    expect(applyExclusionFilter).toHaveBeenCalled()
  })

  it('applies exclusion filter to sublayers when dataset has sublayers', () => {
    const { adapter } = makeAdapter()
    const ds = {
      ...dataset,
      sublayers: [{ id: 'sl', filter: null }]
    }
    adapter.showFeatures(ds, 'id', [])
    expect(applyExclusionFilter).toHaveBeenCalledWith(
      adapter._map, 'ds-sl', null, 'id', []
    )
    expect(applyExclusionFilter).toHaveBeenCalledWith(
      adapter._map, 'ds-sl-stroke', null, 'id', []
    )
  })
})

// ─── setStyle ─────────────────────────────────────────────────────────────────

describe('setStyle', () => {
  it('removes existing layers before re-adding', async () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill', 'ds-stroke': 'line' })
    await adapter.setStyle(dataset, mapStyle)
    expect(map.removeLayer).toHaveBeenCalledWith('ds-fill')
    expect(map.removeLayer).toHaveBeenCalledWith('ds-stroke')
  })

  it('registers patterns and symbols', async () => {
    const { adapter, mapProvider } = makeAdapter()
    await adapter.setStyle(dataset, mapStyle)
    expect(mapProvider.registerPatterns).toHaveBeenCalled()
    expect(mapProvider.registerSymbols).toHaveBeenCalled()
  })

  it('calls addDatasetLayers to rebuild', async () => {
    const { adapter } = makeAdapter()
    await adapter.setStyle(dataset, mapStyle)
    expect(addDatasetLayers).toHaveBeenCalled()
  })
})

// ─── setSublayerStyle ─────────────────────────────────────────────────────────

describe('setSublayerStyle', () => {
  it('removes existing sublayer layers before re-adding', async () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill', 'ds-sl-stroke': 'line', 'ds-sl-symbol': 'symbol' })
    adapter._datasetSourceMap.set('ds', 'source-ds')
    const ds = { ...dataset, sublayers: [{ id: 'sl' }] }
    await adapter.setSublayerStyle(ds, 'sl', mapStyle)
    expect(map.removeLayer).toHaveBeenCalledWith('ds-sl')
    expect(map.removeLayer).toHaveBeenCalledWith('ds-sl-stroke')
    expect(map.removeLayer).toHaveBeenCalledWith('ds-sl-symbol')
  })

  it('calls addSublayerLayers after registering patterns/symbols', async () => {
    const { adapter } = makeAdapter()
    adapter._datasetSourceMap.set('ds', 'source-ds')
    const ds = { ...dataset, sublayers: [{ id: 'sl' }] }
    await adapter.setSublayerStyle(ds, 'sl', mapStyle)
    expect(addSublayerLayers).toHaveBeenCalled()
  })

  it('does nothing if sublayer is not found', async () => {
    const { adapter } = makeAdapter()
    const ds = { ...dataset, sublayers: [] }
    await adapter.setSublayerStyle(ds, 'missing', mapStyle)
    expect(addSublayerLayers).not.toHaveBeenCalled()
  })
})

// ─── setOpacity ───────────────────────────────────────────────────────────────

describe('setOpacity', () => {
  it('sets fill-opacity on fill layers', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds', type: 'fill' }] })
    map.getLayer.mockImplementation((id) => id === 'ds' ? { id, type: 'fill' } : undefined)
    adapter.setOpacity('ds', 0.5)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds', 'fill-opacity', 0.5)
  })

  it('sets line-opacity on line layers', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds-stroke', type: 'line' }] })
    map.getLayer.mockImplementation((id) => id === 'ds-stroke' ? { id, type: 'line' } : undefined)
    adapter.setOpacity('ds', 0.3)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds-stroke', 'line-opacity', 0.3)
  })

  it('sets icon-opacity on symbol layers', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds', type: 'symbol' }] })
    map.getLayer.mockImplementation((id) => id === 'ds' ? { id, type: 'symbol' } : undefined)
    adapter.setOpacity('ds', 0.8)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds', 'icon-opacity', 0.8)
  })

  it('does nothing when map style is null', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue(null)
    expect(() => adapter.setOpacity('ds', 0.5)).not.toThrow()
    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })
})

// ─── setSublayerOpacity ───────────────────────────────────────────────────────

describe('setSublayerOpacity', () => {
  it('sets opacity on both fill and stroke sublayer layers', () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill', 'ds-sl-stroke': 'line' })
    adapter.setSublayerOpacity('ds', 'sl', 0.4)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds-sl', 'fill-opacity', 0.4)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds-sl-stroke', 'line-opacity', 0.4)
  })
})

// ─── setData ──────────────────────────────────────────────────────────────────

describe('setData', () => {
  it('calls setData on the source with the new geojson', async () => {
    const { adapter, map } = makeAdapter()
    const mockSetData = jest.fn()
    map.getSource.mockReturnValue({ setData: mockSetData })
    adapter._datasetSourceMap.set('ds', 'source-ds')
    const geojson = { type: 'FeatureCollection', features: [] }
    adapter.setData('ds', geojson)
    expect(mockSetData).toHaveBeenCalledWith(geojson)
  })

  it('does nothing when datasetId is not in the source map', () => {
    const { adapter, map } = makeAdapter()
    adapter.setData('unknown', {})
    expect(map.getSource).not.toHaveBeenCalled()
  })

  it('does nothing when source does not have a setData method', () => {
    const { adapter, map } = makeAdapter()
    map.getSource.mockReturnValue({})
    adapter._datasetSourceMap.set('ds', 'source-ds')
    expect(() => adapter.setData('ds', {})).not.toThrow()
  })
})

// ─── onStyleChange ────────────────────────────────────────────────────────────

describe('onStyleChange', () => {
  it('waits for map idle before adding layers', async () => {
    const { adapter, map } = makeAdapter()
    await adapter.onStyleChange([dataset], mapStyle, {}, new Map())
    expect(map.once).toHaveBeenCalledWith('idle', expect.any(Function))
  })

  it('re-registers patterns and symbols', async () => {
    const { adapter, mapProvider } = makeAdapter()
    await adapter.onStyleChange([dataset], mapStyle, {}, new Map())
    expect(mapProvider.registerPatterns).toHaveBeenCalled()
    expect(mapProvider.registerSymbols).toHaveBeenCalled()
  })

  it('re-adds layers for all datasets', async () => {
    const { adapter } = makeAdapter()
    await adapter.onStyleChange([dataset], mapStyle, {}, new Map())
    expect(addDatasetLayers).toHaveBeenCalled()
  })

  it('calls reapply on each dynamic source', async () => {
    const { adapter } = makeAdapter()
    const reapply = jest.fn()
    const dynamicSources = new Map([['ds', { reapply }]])
    await adapter.onStyleChange([dataset], mapStyle, {}, dynamicSources)
    expect(reapply).toHaveBeenCalled()
  })

  it('reapplies hidden feature filters', async () => {
    const { adapter } = makeAdapter({ 'ds-fill': 'fill' })
    const hiddenFeatures = { ds: { idProperty: 'id', ids: [1, 2] } }
    await adapter.onStyleChange([dataset], mapStyle, hiddenFeatures, new Map())
    expect(applyExclusionFilter).toHaveBeenCalled()
  })
})

// ─── onSizeChange ─────────────────────────────────────────────────────────────

describe('onSizeChange', () => {
  it('re-registers symbols and patterns', async () => {
    const { adapter, mapProvider } = makeAdapter()
    await adapter.onSizeChange([dataset], mapStyle)
    expect(mapProvider.registerSymbols).toHaveBeenCalled()
    expect(mapProvider.registerPatterns).toHaveBeenCalled()
  })

  it('updates icon-image on symbol layers when imageId resolves', async () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'symbol' })
    adapter._symbolLayerIds.add('ds-fill')
    getSymbolImageId.mockReturnValue('new-img')
    await adapter.onSizeChange([dataset], mapStyle)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-fill', 'icon-image', 'new-img')
  })

  it('updates fill-pattern on pattern layers when imageId resolves', async () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill' })
    hasPattern.mockReturnValue(true)
    getPatternImageId.mockReturnValue('pattern-img')
    getLayerIds.mockReturnValue({ fillLayerId: 'ds-fill', strokeLayerId: 'ds-stroke', symbolLayerId: null })
    await adapter.onSizeChange([dataset], mapStyle)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds-fill', 'fill-pattern', 'pattern-img')
  })

  it('updates sublayer symbol layers on size change', async () => {
    const { adapter, map } = makeAdapter({ 'ds-sl-symbol': 'symbol' })
    const ds = { ...dataset, sublayers: [{ id: 'sl' }] }
    mergeSublayer.mockReturnValue({ symbol: 'marker' })
    map.getLayer.mockImplementation((id) => id === 'ds-sl-symbol' ? { id, type: 'symbol' } : undefined)
    getSymbolImageId.mockReturnValue('sym-img')
    await adapter.onSizeChange([ds], mapStyle)
    expect(map.setLayoutProperty).toHaveBeenCalledWith('ds-sl-symbol', 'icon-image', 'sym-img')
  })

  // line 154-156: sublayer pattern fill-pattern update
  it('updates sublayer fill-pattern on size change when sublayer has a pattern', async () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill' })
    const ds = { ...dataset, sublayers: [{ id: 'sl' }] }
    const merged = { fillPattern: 'dots' }
    mergeSublayer.mockReturnValue(merged)
    hasPattern.mockImplementation((config) => config === merged)
    map.getLayer.mockImplementation((id) => id === 'ds-sl' ? { id, type: 'fill' } : undefined)
    getPatternImageId.mockReturnValue('sublayer-pattern-img')
    await adapter.onSizeChange([ds], mapStyle)
    expect(map.setPaintProperty).toHaveBeenCalledWith('ds-sl', 'fill-pattern', 'sublayer-pattern-img')
  })

  it('does not update sublayer fill-pattern when getPatternImageId returns null', async () => {
    const { adapter, map } = makeAdapter({ 'ds-sl': 'fill' })
    const ds = { ...dataset, sublayers: [{ id: 'sl' }] }
    const merged = { fillPattern: 'dots' }
    mergeSublayer.mockReturnValue(merged)
    hasPattern.mockImplementation((config) => config === merged)
    map.getLayer.mockImplementation((id) => id === 'ds-sl' ? { id, type: 'fill' } : undefined)
    getPatternImageId.mockReturnValue(null)
    await adapter.onSizeChange([ds], mapStyle)
    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })
})

// ─── onStyleChange: hiddenFeatures dataset not found (line 108) ───────────────

describe('onStyleChange — hiddenFeatures skips missing dataset', () => {
  it('does not apply filter when hiddenFeatures references a datasetId not in the list', async () => {
    const { adapter } = makeAdapter()
    const hiddenFeatures = { 'nonexistent-id': { idProperty: 'id', ids: [1] } }
    await adapter.onStyleChange([dataset], mapStyle, hiddenFeatures, new Map())
    expect(applyExclusionFilter).not.toHaveBeenCalled()
  })
})

// ─── _getFirstSymbolLayerId: null when style has no layers (line 379) ─────────

describe('_getFirstSymbolLayerId', () => {
  it('returns null when map style is null', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue(null)
    expect(adapter._getFirstSymbolLayerId()).toBeNull()
  })

  it('returns null when no tracked symbol layer is present in the style', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds-fill' }] })
    expect(adapter._getFirstSymbolLayerId()).toBeNull()
  })

  it('returns the id of the first tracked symbol layer found in the style', () => {
    const { adapter, map } = makeAdapter()
    adapter._symbolLayerIds.add('ds-symbol')
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds-fill' }, { id: 'ds-symbol' }] })
    expect(adapter._getFirstSymbolLayerId()).toBe('ds-symbol')
  })
})

// ─── _maintainSymbolOrdering (lines 389, 398-400) ────────────────────────────

describe('_maintainSymbolOrdering', () => {
  it('adds a symbol-type layer id to _symbolLayerIds (line 389)', () => {
    const { adapter, map } = makeAdapter()
    getAllLayerIds.mockReturnValue(['ds-symbol'])
    map.getLayer.mockImplementation((id) => ({ id, type: 'symbol' }))
    adapter._maintainSymbolOrdering(dataset)
    expect(adapter._symbolLayerIds.has('ds-symbol')).toBe(true)
  })

  it('removes a non-symbol layer id from _symbolLayerIds', () => {
    const { adapter, map } = makeAdapter()
    adapter._symbolLayerIds.add('ds-fill')
    getAllLayerIds.mockReturnValue(['ds-fill'])
    map.getLayer.mockImplementation((id) => ({ id, type: 'fill' }))
    adapter._maintainSymbolOrdering(dataset)
    expect(adapter._symbolLayerIds.has('ds-fill')).toBe(false)
  })

  it('moves non-symbol layers below the first symbol layer (lines 398-400)', () => {
    const { adapter, map } = makeAdapter()
    getAllLayerIds.mockReturnValue(['ds-fill', 'ds-symbol'])
    map.getLayer.mockImplementation((id) => ({
      id,
      type: id === 'ds-symbol' ? 'symbol' : 'fill'
    }))
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds-fill' }, { id: 'ds-symbol' }] })
    adapter._maintainSymbolOrdering(dataset)
    expect(map.moveLayer).toHaveBeenCalledWith('ds-fill', 'ds-symbol')
  })

  it('does not call moveLayer when there is no symbol layer', () => {
    const { adapter, map } = makeAdapter()
    getAllLayerIds.mockReturnValue(['ds-fill', 'ds-stroke'])
    map.getLayer.mockImplementation((id) => ({ id, type: 'fill' }))
    map.getStyle.mockReturnValue({ layers: [{ id: 'ds-fill' }, { id: 'ds-stroke' }] })
    adapter._maintainSymbolOrdering(dataset)
    expect(map.moveLayer).not.toHaveBeenCalled()
  })
})

// ─── _setPaintOpacity: missing layer early-return (line 443) ─────────────────

describe('_setPaintOpacity — missing layer', () => {
  it('does nothing when the layer does not exist (line 443)', () => {
    const { adapter, map } = makeAdapter()
    map.getLayer.mockReturnValue(undefined)
    adapter._setPaintOpacity('nonexistent', 0.5)
    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })
})

// ─── _getLayersUsingSource: null style early-return (line 453) ───────────────

describe('_getLayersUsingSource', () => {
  it('returns an empty array when map style is null (line 453)', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue(null)
    expect(adapter._getLayersUsingSource('source-ds')).toEqual([])
  })

  it('returns ids of layers that use the given source', () => {
    const { adapter, map } = makeAdapter()
    map.getStyle.mockReturnValue({
      layers: [
        { id: 'ds-fill', source: 'source-ds' },
        { id: 'other-fill', source: 'source-other' }
      ]
    })
    expect(adapter._getLayersUsingSource('source-ds')).toEqual(['ds-fill'])
  })
})

// ─── destroy: shared source not removed twice (line 71) ──────────────────────

describe('destroy — shared source deduplication', () => {
  it('removes a shared source only once when two datasets reference it (line 71)', () => {
    const { adapter, map } = makeAdapter()
    const ds1 = { id: 'ds1' }
    const ds2 = { id: 'ds2' }
    // Both datasets resolve to the same source
    getSourceId.mockReturnValue('shared-source')
    getAllLayerIds.mockReturnValue([])
    map.getStyle.mockReturnValue({ layers: [] })
    adapter.destroy([ds1, ds2])
    expect(map.removeSource).toHaveBeenCalledTimes(1)
    expect(map.removeSource).toHaveBeenCalledWith('shared-source')
  })

  it('does not remove source when map.getSource returns nothing (line 71)', () => {
    const { adapter, map } = makeAdapter()
    getAllLayerIds.mockReturnValue([])
    map.getStyle.mockReturnValue({ layers: [] })
    map.getSource.mockReturnValue(undefined)
    adapter.destroy([dataset])
    expect(map.removeSource).not.toHaveBeenCalled()
  })
})

// ─── onSizeChange: null imageId guards (lines 131, 137-139, 149) ─────────────

describe('onSizeChange — null imageId guards', () => {
  it('does not call setLayoutProperty when getSymbolImageId returns null for a tracked symbol layer (line 131)', async () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'symbol' })
    adapter._symbolLayerIds.add('ds-fill')
    getSymbolImageId.mockReturnValue(null)
    await adapter.onSizeChange([dataset], mapStyle)
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })

  it('does not enter fill-pattern block when the fill layer does not exist (line 137)', async () => {
    const { adapter, map } = makeAdapter()
    hasPattern.mockReturnValue(true)
    getLayerIds.mockReturnValue({ fillLayerId: 'ds-fill', strokeLayerId: null, symbolLayerId: null })
    map.getLayer.mockReturnValue(undefined)
    await adapter.onSizeChange([dataset], mapStyle)
    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })

  it('does not call setPaintProperty when fill layer exists but getPatternImageId returns null (lines 138-139)', async () => {
    const { adapter, map } = makeAdapter({ 'ds-fill': 'fill' })
    hasPattern.mockReturnValue(true)
    getLayerIds.mockReturnValue({ fillLayerId: 'ds-fill', strokeLayerId: null, symbolLayerId: null })
    getPatternImageId.mockReturnValue(null)
    await adapter.onSizeChange([dataset], mapStyle)
    expect(map.setPaintProperty).not.toHaveBeenCalled()
  })

  it('does not call setLayoutProperty when sublayer symbol layer exists but getSymbolImageId returns null (line 149)', async () => {
    const { adapter, map } = makeAdapter({ 'ds-sl-symbol': 'symbol' })
    const ds = { ...dataset, sublayers: [{ id: 'sl' }] }
    mergeSublayer.mockReturnValue({ symbol: 'marker' })
    map.getLayer.mockImplementation((id) => id === 'ds-sl-symbol' ? { id, type: 'symbol' } : undefined)
    getSymbolImageId.mockReturnValue(null)
    await adapter.onSizeChange([ds], mapStyle)
    expect(map.setLayoutProperty).not.toHaveBeenCalled()
  })
})

// ─── setSublayerStyle: tiled dataset uses sourceLayer (line 314) ─────────────

describe('setSublayerStyle — tiled dataset', () => {
  it('passes the dataset sourceLayer to addSublayerLayers for a tiled dataset (line 314)', async () => {
    const { adapter } = makeAdapter()
    const tiledDataset = { ...dataset, tiles: ['https://tiles/{z}/{x}/{y}'], sourceLayer: 'buildings', sublayers: [{ id: 'sl' }] }
    adapter._datasetSourceMap.set('ds', 'source-ds')
    await adapter.setSublayerStyle(tiledDataset, 'sl', mapStyle)
    expect(addSublayerLayers).toHaveBeenCalledWith(
      adapter._map, tiledDataset, { id: 'sl' }, 'source-ds', 'buildings', expect.any(Object)
    )
  })
})

// ─── _applyFeatureFilter: combined dataset+sublayer filter (line 424) ─────────

describe('_applyFeatureFilter — combined filter', () => {
  it('combines dataset and sublayer filters with all when both are present (line 424)', () => {
    const { adapter } = makeAdapter()
    const ds = {
      ...dataset,
      filter: ['==', 'type', 'park'],
      sublayers: [{ id: 'sl', filter: ['==', 'class', 'wood'] }]
    }
    adapter._applyFeatureFilter(ds, 'id', [])
    expect(applyExclusionFilter).toHaveBeenCalledWith(
      adapter._map, 'ds-sl', ['all', ['==', 'type', 'park'], ['==', 'class', 'wood']], 'id', []
    )
  })

  it('uses only the sublayer filter when the dataset has no filter', () => {
    const { adapter } = makeAdapter()
    const ds = {
      ...dataset,
      filter: null,
      sublayers: [{ id: 'sl', filter: ['==', 'class', 'road'] }]
    }
    adapter._applyFeatureFilter(ds, 'id', [])
    expect(applyExclusionFilter).toHaveBeenCalledWith(
      adapter._map, 'ds-sl', ['==', 'class', 'road'], 'id', []
    )
  })
})
