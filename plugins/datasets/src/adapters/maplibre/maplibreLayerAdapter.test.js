import MaplibreLayerAdapter from './maplibreLayerAdapter.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { patternRegistry } from '../../../../../../src/services/patternRegistry.js'

jest.mock('../../registry/datasetRegistry.js')

// ─── helpers ─────────────────────────────────────────────────────────────────

const makeMap = () => {
  const layers = new Map()
  const sources = new Map()
  return {
    _layers: layers,
    _sources: sources,
    addLayer: jest.fn(layer => { layers.set(layer.id, { ...layer }) }),
    addSource: jest.fn((id, spec) => { sources.set(id, { ...spec, setData: jest.fn() }) }),
    getLayer: jest.fn(id => layers.get(id) ?? null),
    getSource: jest.fn(id => sources.get(id) ?? null),
    removeLayer: jest.fn(id => { layers.delete(id) }),
    removeSource: jest.fn(id => { sources.delete(id) }),
    setLayoutProperty: jest.fn((id, prop, val) => {
      const layer = layers.get(id)
      if (layer) { layer.layout = { ...(layer.layout || {}), [prop]: val } }
    }),
    setPaintProperty: jest.fn(),
    setFilter: jest.fn(),
    moveLayer: jest.fn(),
    getStyle: jest.fn(() => ({ layers: [...layers.values()] })),
    getPixelRatio: jest.fn(() => 1),
    once: jest.fn((event, cb) => { if (event === 'idle') cb() })
  }
}

const makeMapProvider = (map) => ({
  map,
  addPatternsToMap: jest.fn().mockResolvedValue(undefined),
  addSymbolsToMap: jest.fn().mockResolvedValue(undefined)
})

const MAP_STYLE = { id: 'outdoor', layers: [] }

let map, mapProvider, adapter
const dynamicSources = new Map()

beforeEach(() => {
  datasetRegistry.attachMapStyle(MAP_STYLE)
  symbolRegistry.clear()
  symbolRegistry.initialise()
  patternRegistry.clear()
  patternRegistry.initialise()

  map = makeMap()
  mapProvider = makeMapProvider(map)
  adapter = new MaplibreLayerAdapter(mapProvider, symbolRegistry, patternRegistry)
  adapter.attachDynamicSources(dynamicSources)
  datasetRegistry.attachCreateDataset(adapter.createDataset)
})

// ─── init ─────────────────────────────────────────────────────────────────────

describe('init', () => {
  it('calls addPatternsAndSymbolsToMap before adding layers', async () => {
    await adapter.init()
    expect(mapProvider.addPatternsToMap).toHaveBeenCalled()
    expect(mapProvider.addSymbolsToMap).toHaveBeenCalled()
  })

  it('adds fill + stroke layers for existing-fields', async () => {
    await adapter.init()
    expect(map.getLayer('existing-fields')).toMatchObject({ type: 'fill' })
    expect(map.getLayer('existing-fields-stroke')).toMatchObject({ type: 'line' })
  })

  it('adds symbol layers for all historic-monuments sublayers', async () => {
    await adapter.init()
    expect(map.getLayer('historic-monuments-prehistoric')).toMatchObject({ type: 'symbol' })
    expect(map.getLayer('historic-monuments-roman')).toMatchObject({ type: 'symbol' })
    expect(map.getLayer('historic-monuments-medieval')).toMatchObject({ type: 'symbol' })
  })

  it('adds fill + stroke layers for land-covers sublayers', async () => {
    await adapter.init()
    expect(map.getLayer('land-covers-130-131')).toMatchObject({ type: 'fill' })
    expect(map.getLayer('land-covers-130-131-stroke')).toMatchObject({ type: 'line' })
    expect(map.getLayer('land-covers-332')).toMatchObject({ type: 'fill' })
    expect(map.getLayer('land-covers-110')).toMatchObject({ type: 'fill' })
    expect(map.getLayer('land-covers-other')).toMatchObject({ type: 'fill' })
  })

  it('adds a stroke-only layer for hedge-control', async () => {
    await adapter.init()
    expect(map.getLayer('hedge-control')).toMatchObject({ type: 'line' })
  })

  it('adds a vector source for existing-fields', async () => {
    await adapter.init()
    const ds = datasetRegistry.getDataset('existing-fields')
    expect(map.addSource).toHaveBeenCalledWith(ds.sourceId, expect.objectContaining({ type: 'vector' }))
  })

  it('adds a geojson source for historic-monuments', async () => {
    await adapter.init()
    const ds = datasetRegistry.getDataset('historic-monuments')
    expect(map.addSource).toHaveBeenCalledWith(ds.sourceId, expect.objectContaining({ type: 'geojson' }))
  })

  it('adds a dynamic geojson source for land-covers', async () => {
    await adapter.init()
    const ds = datasetRegistry.getDataset('land-covers')
    expect(map.addSource).toHaveBeenCalledWith(ds.sourceId, expect.objectContaining({ type: 'geojson' }))
  })

  it('adds each source only once even when multiple sublayers share it', async () => {
    await adapter.init()
    const ds = datasetRegistry.getDataset('historic-monuments')
    const calls = map.addSource.mock.calls.filter(([id]) => id === ds.sourceId)
    expect(calls).toHaveLength(1)
  })

  it('waits for map idle before resolving', async () => {
    await adapter.init()
    expect(map.once).toHaveBeenCalledWith('idle', expect.any(Function))
  })

  it('tracks symbol layers in _symbolLayerIds', async () => {
    await adapter.init()
    expect(adapter._symbolLayerIds.has('historic-monuments-prehistoric')).toBe(true)
    expect(adapter._symbolLayerIds.has('historic-monuments-roman')).toBe(true)
    expect(adapter._symbolLayerIds.has('historic-monuments-medieval')).toBe(true)
  })

  it('does not track fill/line layers in _symbolLayerIds', async () => {
    await adapter.init()
    expect(adapter._symbolLayerIds.has('existing-fields')).toBe(false)
    expect(adapter._symbolLayerIds.has('land-covers-130-131')).toBe(false)
    expect(adapter._symbolLayerIds.has('hedge-control')).toBe(false)
  })
})

// ─── removeLayer ──────────────────────────────────────────────────────────────

describe('removeLayer', () => {
  it('removes an existing layer from the map', async () => {
    await adapter.init()
    adapter.removeLayer('existing-fields')
    expect(map.removeLayer).toHaveBeenCalledWith('existing-fields')
    expect(map.getLayer('existing-fields')).toBeNull()
  })

  it('does not call map.removeLayer when the layer does not exist', () => {
    adapter.removeLayer('nonexistent-layer')
    expect(map.removeLayer).not.toHaveBeenCalled()
  })

  it('removes the layer id from _symbolLayerIds', async () => {
    await adapter.init()
    expect(adapter._symbolLayerIds.has('historic-monuments-prehistoric')).toBe(true)
    adapter.removeLayer('historic-monuments-prehistoric')
    expect(adapter._symbolLayerIds.has('historic-monuments-prehistoric')).toBe(false)
  })
})

// ─── destroy ──────────────────────────────────────────────────────────────────

describe('destroy', () => {
  beforeEach(async () => { await adapter.init() })

  it('removes all layers from the map', () => {
    adapter.destroy()
    expect(map._layers.size).toBe(0)
  })

  it('removes all sources from the map', () => {
    adapter.destroy()
    expect(map._sources.size).toBe(0)
  })

  it('clears _datasetSourceMap', () => {
    adapter.destroy()
    expect(adapter._datasetSourceMap.size).toBe(0)
  })

  it('does not throw when getStyle returns null (covers _getLayersUsingSource early return)', () => {
    map.getStyle.mockReturnValue(null)
    expect(() => adapter.destroy()).not.toThrow()
  })
})

// ─── addDataset ───────────────────────────────────────────────────────────────

describe('addDataset', () => {
  it('adds source and layers for a dataset not yet on the map', async () => {
    await adapter.addDataset('existing-fields', MAP_STYLE)
    expect(map.getLayer('existing-fields')).toBeTruthy()
    expect(map.getLayer('existing-fields-stroke')).toBeTruthy()
  })

  it('adds symbol layers for all historic-monuments sublayers', async () => {
    await adapter.addDataset('historic-monuments', MAP_STYLE)
    expect(map.getLayer('historic-monuments-prehistoric')).toBeTruthy()
    expect(map.getLayer('historic-monuments-roman')).toBeTruthy()
    expect(map.getLayer('historic-monuments-medieval')).toBeTruthy()
  })

  it('calls addPatternsAndSymbolsToMap for the specific dataset', async () => {
    await adapter.addDataset('historic-monuments', MAP_STYLE)
    expect(mapProvider.addPatternsToMap).toHaveBeenCalled()
    expect(mapProvider.addSymbolsToMap).toHaveBeenCalled()
  })

  it('does not call moveLayer when getStyle returns no layers (covers _getFirstSymbolLayerId null branch)', async () => {
    map.getStyle.mockReturnValue({})
    await adapter.addDataset('existing-fields')
    expect(map.moveLayer).not.toHaveBeenCalled()
  })
})

// ─── removeDataset ────────────────────────────────────────────────────────────

describe('removeDataset', () => {
  beforeEach(async () => { await adapter.init() })

  it('removes all layers for existing-fields', () => {
    adapter.removeDataset('existing-fields')
    expect(map.getLayer('existing-fields')).toBeNull()
    expect(map.getLayer('existing-fields-stroke')).toBeNull()
  })

  it('does not remove source for existing-fields because it shares its tiles URL with hedge-control', () => {
    const ds = datasetRegistry.getDataset('existing-fields')
    adapter.removeDataset('existing-fields')
    expect(map.getSource(ds.sourceId)).toBeTruthy()
  })

  it('removes all sublayer symbol layers for historic-monuments', () => {
    adapter.removeDataset('historic-monuments')
    expect(map.getLayer('historic-monuments-prehistoric')).toBeNull()
    expect(map.getLayer('historic-monuments-roman')).toBeNull()
    expect(map.getLayer('historic-monuments-medieval')).toBeNull()
  })

  it('removes the source when removing historic-monuments (unique source)', () => {
    const ds = datasetRegistry.getDataset('historic-monuments')
    adapter.removeDataset('historic-monuments')
    expect(map.getSource(ds.sourceId)).toBeNull()
  })

  it('does not remove source shared by remaining land-covers sublayers', () => {
    const parentDs = datasetRegistry.getDataset('land-covers')
    adapter.removeDataset('land-covers-130-131')
    expect(map.getSource(parentDs.sourceId)).toBeTruthy()
  })

  it('deletes the dataset from _datasetSourceMap', () => {
    adapter.removeDataset('hedge-control')
    expect(adapter._datasetSourceMap.has('hedge-control')).toBe(false)
  })

  it('does nothing when the dataset is not in the registry', () => {
    const removeBefore = map.removeLayer.mock.calls.length
    adapter.removeDataset('nonexistent')
    expect(map.removeLayer.mock.calls.length).toBe(removeBefore)
  })
})

// ─── setData ──────────────────────────────────────────────────────────────────

describe('setData', () => {
  beforeEach(async () => { await adapter.init() })

  it('calls source.setData for a dynamic dataset (land-covers)', () => {
    const ds = datasetRegistry.getDataset('land-covers')
    const geojson = { type: 'FeatureCollection', features: [] }
    adapter.setData('land-covers', geojson)
    expect(map.getSource(ds.sourceId).setData).toHaveBeenCalledWith(geojson)
  })

  it('does nothing when the dataset is not in _datasetSourceMap', () => {
    expect(() => adapter.setData('unknown-dataset', {})).not.toThrow()
  })

  it('does nothing when the source does not have a setData method', () => {
    adapter._datasetSourceMap.set('bare-ds', 'bare-source')
    map._sources.set('bare-source', { type: 'vector' })
    expect(() => adapter.setData('bare-ds', {})).not.toThrow()
  })
})

// ─── applyDatasetVisibility ───────────────────────────────────────────────────

describe('applyDatasetVisibility', () => {
  beforeEach(async () => { await adapter.init() })

  it('sets visibility to "visible" for existing-fields layers', () => {
    adapter.applyDatasetVisibility('existing-fields')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('existing-fields', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('existing-fields-stroke', 'visibility', 'visible')
  })

  it('sets visibility to "none" for hedge-control (visible: false)', () => {
    adapter.applyDatasetVisibility('hedge-control')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('hedge-control', 'visibility', 'none')
  })

  it('sets visibility on all sublayer symbol layers for historic-monuments', () => {
    adapter.applyDatasetVisibility('historic-monuments')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('historic-monuments-prehistoric', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('historic-monuments-roman', 'visibility', 'visible')
    expect(map.setLayoutProperty).toHaveBeenCalledWith('historic-monuments-medieval', 'visibility', 'visible')
  })

  it('does nothing for an unknown dataset', () => {
    const before = map.setLayoutProperty.mock.calls.length
    adapter.applyDatasetVisibility('unknown')
    expect(map.setLayoutProperty.mock.calls.length).toBe(before)
  })

  it('skips setLayoutProperty for a layer that has been removed from the map', () => {
    map._layers.delete('existing-fields')
    map.setLayoutProperty.mockClear()
    adapter.applyDatasetVisibility('existing-fields')
    expect(map.setLayoutProperty).not.toHaveBeenCalledWith('existing-fields', 'visibility', expect.any(String))
  })
})

// ─── applyGlobalVisibility ────────────────────────────────────────────────────

describe('applyGlobalVisibility', () => {
  beforeEach(async () => { await adapter.init() })

  it('sets visibility on layers for all top-level datasets', () => {
    map.setLayoutProperty.mockClear()
    adapter.applyGlobalVisibility()
    const ids = map.setLayoutProperty.mock.calls.map(([id]) => id)
    expect(ids).toContain('existing-fields')
    expect(ids).toContain('existing-fields-stroke')
    expect(ids).toContain('historic-monuments-prehistoric')
    expect(ids).toContain('hedge-control')
    expect(ids).toContain('land-covers-130-131')
  })
})

// ─── applyFeatureFilter ───────────────────────────────────────────────────────

describe('applyFeatureFilter', () => {
  beforeEach(async () => { await adapter.init() })

  it('sets filter on all land-covers sublayers (parent has hiddenFeatures: [42])', () => {
    adapter.applyFeatureFilter('land-covers')
    const ids = map.setFilter.mock.calls.map(([id]) => id)
    expect(ids).toContain('land-covers-130-131')
    expect(ids).toContain('land-covers-332')
    expect(ids).toContain('land-covers-110')
    expect(ids).toContain('land-covers-other')
  })

  it('passes a non-null filter expression for land-covers sublayers', () => {
    adapter.applyFeatureFilter('land-covers')
    const [, filter] = map.setFilter.mock.calls.find(([id]) => id === 'land-covers-332')
    expect(filter).not.toBeNull()
  })

  it('does not call setFilter when dataset has no hidden features (historic-monuments)', () => {
    map.setFilter.mockClear()
    adapter.applyFeatureFilter('historic-monuments')
    expect(map.setFilter).not.toHaveBeenCalled()
  })

  it('does not call setFilter for existing-fields (no hidden features)', () => {
    map.setFilter.mockClear()
    adapter.applyFeatureFilter('existing-fields')
    expect(map.setFilter).not.toHaveBeenCalled()
  })

  it('does nothing for an unknown dataset', () => {
    map.setFilter.mockClear()
    adapter.applyFeatureFilter('unknown')
    expect(map.setFilter).not.toHaveBeenCalled()
  })

  it('skips setFilter for a sublayer whose layer has been removed from the map', () => {
    map._layers.delete('land-covers-130-131')
    map.setFilter.mockClear()
    adapter.applyFeatureFilter('land-covers')
    expect(map.setFilter).not.toHaveBeenCalledWith('land-covers-130-131', expect.anything())
  })
})

// ─── applyDatasetOpacity ──────────────────────────────────────────────────────

describe('applyDatasetOpacity', () => {
  beforeEach(async () => { await adapter.init() })

  it('sets fill-opacity on the fill layer for existing-fields', () => {
    adapter.applyDatasetOpacity('existing-fields')
    expect(map.setPaintProperty).toHaveBeenCalledWith('existing-fields', 'fill-opacity', expect.any(Number))
  })

  it('sets line-opacity on the stroke layer for existing-fields', () => {
    adapter.applyDatasetOpacity('existing-fields')
    expect(map.setPaintProperty).toHaveBeenCalledWith('existing-fields-stroke', 'line-opacity', expect.any(Number))
  })

  it('sets icon-opacity on symbol layers for historic-monuments sublayers', () => {
    adapter.applyDatasetOpacity('historic-monuments')
    expect(map.setPaintProperty).toHaveBeenCalledWith('historic-monuments-prehistoric', 'icon-opacity', expect.any(Number))
    expect(map.setPaintProperty).toHaveBeenCalledWith('historic-monuments-roman', 'icon-opacity', expect.any(Number))
    expect(map.setPaintProperty).toHaveBeenCalledWith('historic-monuments-medieval', 'icon-opacity', expect.any(Number))
  })

  it('sets fill-opacity on land-covers sublayer fill layers', () => {
    adapter.applyDatasetOpacity('land-covers')
    expect(map.setPaintProperty).toHaveBeenCalledWith('land-covers-130-131', 'fill-opacity', expect.any(Number))
    expect(map.setPaintProperty).toHaveBeenCalledWith('land-covers-332', 'fill-opacity', expect.any(Number))
  })

  it('does nothing for an unknown dataset', () => {
    const before = map.setPaintProperty.mock.calls.length
    adapter.applyDatasetOpacity('unknown')
    expect(map.setPaintProperty.mock.calls.length).toBe(before)
  })

  it('does not call setPaintProperty for a layer that has been removed from the map (covers _setPaintOpacity early return)', () => {
    map._layers.delete('existing-fields')
    map.setPaintProperty.mockClear()
    adapter.applyDatasetOpacity('existing-fields')
    expect(map.setPaintProperty).not.toHaveBeenCalledWith('existing-fields', expect.any(String), expect.any(Number))
  })
})

// ─── applyGlobalOpacity ───────────────────────────────────────────────────────

describe('applyGlobalOpacity', () => {
  beforeEach(async () => { await adapter.init() })

  it('sets paint opacity on layers for all datasets', () => {
    map.setPaintProperty.mockClear()
    adapter.applyGlobalOpacity()
    const ids = map.setPaintProperty.mock.calls.map(([id]) => id)
    expect(ids).toContain('existing-fields')
    expect(ids).toContain('existing-fields-stroke')
    expect(ids).toContain('historic-monuments-prehistoric')
    expect(ids).toContain('hedge-control')
    expect(ids).toContain('land-covers-130-131')
  })
})

// ─── applyStyle ───────────────────────────────────────────────────────────────

describe('applyStyle', () => {
  beforeEach(async () => { await adapter.init() })

  it('removes old fill + stroke layers then re-adds them for existing-fields', async () => {
    await adapter.applyStyle('existing-fields', MAP_STYLE)
    expect(map.removeLayer).toHaveBeenCalledWith('existing-fields')
    expect(map.removeLayer).toHaveBeenCalledWith('existing-fields-stroke')
    expect(map.getLayer('existing-fields')).toBeTruthy()
    expect(map.getLayer('existing-fields-stroke')).toBeTruthy()
  })

  it('removes and re-adds the symbol layer for a historic-monuments sublayer', async () => {
    await adapter.applyStyle('historic-monuments-prehistoric', MAP_STYLE)
    expect(map.removeLayer).toHaveBeenCalledWith('historic-monuments-prehistoric')
    expect(map.getLayer('historic-monuments-prehistoric')).toBeTruthy()
  })

  it('calls addPatternsAndSymbolsToMap for the specific dataset', async () => {
    mapProvider.addPatternsToMap.mockClear()
    await adapter.applyStyle('existing-fields', MAP_STYLE)
    expect(mapProvider.addPatternsToMap).toHaveBeenCalled()
  })
})

// ─── onMapStyleChange ─────────────────────────────────────────────────────────

describe('onMapStyleChange', () => {
  beforeEach(async () => { await adapter.init() })

  it('waits for map idle before proceeding', async () => {
    let idleCb
    map.once.mockImplementation((event, cb) => { if (event === 'idle') idleCb = cb })
    const promise = adapter.onMapStyleChange(MAP_STYLE, new Map())
    expect(idleCb).toBeDefined()
    idleCb()
    await promise
  })

  it('calls addPatternsAndSymbolsToMap with the new style', async () => {
    const newStyle = { id: 'dark', layers: [] }
    mapProvider.addPatternsToMap.mockClear()
    await adapter.onMapStyleChange(newStyle, new Map())
    expect(mapProvider.addPatternsToMap).toHaveBeenCalled()
  })

  it('re-adds all dataset layers after a style wipe', async () => {
    map._layers.clear()
    map._sources.clear()
    await adapter.onMapStyleChange(MAP_STYLE, new Map())
    expect(map.getLayer('existing-fields')).toBeTruthy()
    expect(map.getLayer('historic-monuments-prehistoric')).toBeTruthy()
    expect(map.getLayer('land-covers-130-131')).toBeTruthy()
    expect(map.getLayer('hedge-control')).toBeTruthy()
  })

  it('reapplies feature filters for datasets with hidden features', async () => {
    map.setFilter.mockClear()
    await adapter.onMapStyleChange(MAP_STYLE, new Map())
    const ids = map.setFilter.mock.calls.map(([id]) => id)
    expect(ids).toContain('land-covers-130-131')
  })
})

// ─── onMapSizeChange ──────────────────────────────────────────────────────────

describe('onMapSizeChange', () => {
  beforeEach(async () => { await adapter.init() })

  it('updates icon-image layout property for historic-monuments symbol layers', async () => {
    map.setLayoutProperty.mockClear()
    await adapter.onMapSizeChange()
    const symbolUpdates = map.setLayoutProperty.mock.calls.filter(([, prop]) => prop === 'icon-image')
    const ids = symbolUpdates.map(([id]) => id)
    expect(ids).toContain('historic-monuments-prehistoric')
    expect(ids).toContain('historic-monuments-roman')
    expect(ids).toContain('historic-monuments-medieval')
  })

  it('updates fill-pattern paint property for land-covers sublayers', async () => {
    map.setPaintProperty.mockClear()
    await adapter.onMapSizeChange()
    const patternUpdates = map.setPaintProperty.mock.calls.filter(([, prop]) => prop === 'fill-pattern')
    const ids = patternUpdates.map(([id]) => id)
    expect(ids).toContain('land-covers-130-131')
    expect(ids).toContain('land-covers-332')
  })

  it('does not update fill-pattern for existing-fields (no fillPattern style)', async () => {
    map.setPaintProperty.mockClear()
    await adapter.onMapSizeChange()
    const patternUpdates = map.setPaintProperty.mock.calls.filter(([, prop]) => prop === 'fill-pattern')
    expect(patternUpdates.map(([id]) => id)).not.toContain('existing-fields')
  })

  it('calls addPatternsAndSymbolsToMap', async () => {
    mapProvider.addPatternsToMap.mockClear()
    await adapter.onMapSizeChange()
    expect(mapProvider.addPatternsToMap).toHaveBeenCalled()
  })

  it('does not call setLayoutProperty for icon-image when getSymbolImageId returns null', async () => {
    jest.spyOn(symbolRegistry, 'getSymbolImageId').mockReturnValue(null)
    map.setLayoutProperty.mockClear()
    await adapter.onMapSizeChange()
    const symbolUpdates = map.setLayoutProperty.mock.calls.filter(([, prop]) => prop === 'icon-image')
    expect(symbolUpdates).toHaveLength(0)
  })
})
