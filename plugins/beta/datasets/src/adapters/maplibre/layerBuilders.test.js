import { addSource, addFillLayer, addStrokeLayer, addSymbolLayer, addSublayerLayers, addDatasetLayers } from './layerBuilders'

import { getValueForStyle } from '../../../../../../src/utils/getValueForStyle.js'
import { hasPattern, getPatternImageId } from './patternImages.js'
import { mergeSublayer } from '../../utils/mergeSublayer.js'
import { getSourceId, getLayerIds, getSublayerLayerIds, isDynamicSource } from './layerIds.js'
import { hasSymbol, getSymbolDef, getSymbolAnchor, anchorToMaplibre, getSymbolImageId } from './symbolImages.js'

jest.mock('../../../../../../src/utils/getValueForStyle.js', () => ({
  getValueForStyle: jest.fn((value) => value)
}))

jest.mock('./patternImages.js', () => ({
  hasPattern: jest.fn(() => false),
  getPatternImageId: jest.fn(() => 'pattern-img-id')
}))

jest.mock('../../utils/mergeSublayer.js', () => ({
  mergeSublayer: jest.fn((dataset, sublayer) => ({ ...dataset, ...sublayer }))
}))

jest.mock('./layerIds.js', () => ({
  getSourceId: jest.fn(() => 'source-id'),
  getLayerIds: jest.fn(() => ({ fillLayerId: 'ds-fill', strokeLayerId: 'ds-stroke', symbolLayerId: 'ds-symbol' })),
  getSublayerLayerIds: jest.fn(() => ({ fillLayerId: 'sub-fill', strokeLayerId: 'sub-stroke', symbolLayerId: 'sub-symbol' })),
  isDynamicSource: jest.fn(() => false),
  MAX_TILE_ZOOM: 22
}))

jest.mock('./symbolImages.js', () => ({
  hasSymbol: jest.fn(() => false),
  getSymbolDef: jest.fn(() => null),
  getSymbolAnchor: jest.fn(() => 'bottom'),
  anchorToMaplibre: jest.fn((a) => a),
  getSymbolImageId: jest.fn(() => null)
}))

const makeMap = ({ hasSource = false, hasLayer = false } = {}) => ({
  getSource: jest.fn(() => hasSource ? {} : undefined),
  getLayer: jest.fn(() => hasLayer ? {} : undefined),
  addSource: jest.fn(),
  addLayer: jest.fn()
})

beforeEach(() => {
  jest.clearAllMocks()
  hasPattern.mockReturnValue(false)
  hasSymbol.mockReturnValue(false)
  getSymbolDef.mockReturnValue(null)
  getSymbolImageId.mockReturnValue(null)
  isDynamicSource.mockReturnValue(false)
  getValueForStyle.mockImplementation((value) => value)
  getSourceId.mockReturnValue('source-id')
  getLayerIds.mockReturnValue({ fillLayerId: 'ds-fill', strokeLayerId: 'ds-stroke', symbolLayerId: 'ds-symbol' })
  getSublayerLayerIds.mockReturnValue({ fillLayerId: 'sub-fill', strokeLayerId: 'sub-stroke', symbolLayerId: 'sub-symbol' })
  mergeSublayer.mockImplementation((dataset, sublayer) => ({ ...dataset, ...sublayer }))
})

// ─── addSource ────────────────────────────────────────────────────────────────

describe('addSource', () => {
  it('does not add a source if one already exists', () => {
    const map = makeMap({ hasSource: true })
    addSource(map, { tiles: ['https://tiles.example.com/{z}/{x}/{y}'] }, 'source-id')
    expect(map.addSource).not.toHaveBeenCalled()
  })

  it('adds a vector source for a tiles dataset', () => {
    const map = makeMap()
    const dataset = { tiles: ['https://tiles.example.com/{z}/{x}/{y}'], minZoom: 6, maxZoom: 18 }
    addSource(map, dataset, 'my-source')
    expect(map.addSource).toHaveBeenCalledWith('my-source', {
      type: 'vector',
      tiles: dataset.tiles,
      minzoom: 6,
      maxzoom: 18
    })
  })

  it('uses 0 and MAX_TILE_ZOOM as defaults for tiles source zoom levels', () => {
    const map = makeMap()
    addSource(map, { tiles: ['https://tiles.example.com/{z}/{x}/{y}'] }, 'my-source')
    expect(map.addSource).toHaveBeenCalledWith('my-source', expect.objectContaining({
      minzoom: 0,
      maxzoom: 22
    }))
  })

  it('adds a static geojson source with the dataset geojson as data', () => {
    const map = makeMap()
    const geojson = { type: 'FeatureCollection', features: [] }
    addSource(map, { geojson }, 'my-source')
    expect(map.addSource).toHaveBeenCalledWith('my-source', {
      type: 'geojson',
      data: geojson,
      generateId: true
    })
  })

  it('adds a geojson source with an empty FeatureCollection for a dynamic source', () => {
    const map = makeMap()
    isDynamicSource.mockReturnValue(true)
    addSource(map, { geojson: 'https://api.example.com/data' }, 'my-source')
    expect(map.addSource).toHaveBeenCalledWith('my-source', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      generateId: true
    })
  })

  it('does nothing when dataset has neither tiles nor geojson', () => {
    const map = makeMap()
    addSource(map, { id: 'noop' }, 'my-source')
    expect(map.addSource).not.toHaveBeenCalled()
  })
})

// ─── addFillLayer ─────────────────────────────────────────────────────────────

describe('addFillLayer', () => {
  const opts = { mapStyleId: 'default', patternRegistry: {} }

  it('does not add a layer when layerId is falsy', () => {
    const map = makeMap()
    addFillLayer(map, { fill: 'blue' }, null, 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when the layer already exists', () => {
    const map = makeMap({ hasLayer: true })
    addFillLayer(map, { fill: 'blue' }, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when there is no fill and no pattern', () => {
    const map = makeMap()
    addFillLayer(map, { stroke: 'red' }, 'layer-id', 'source-id', undefined, 'visible', { ...opts, pixelRatio: 2 })
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('adds a fill layer with fill-color paint when fill is set', () => {
    const map = makeMap()
    addFillLayer(map, { fill: '#00ff00', minZoom: 6, maxZoom: 18 }, 'layer-id', 'source-id', 'my-layer', 'visible', opts)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'layer-id',
      type: 'fill',
      source: 'source-id',
      'source-layer': 'my-layer',
      layout: { visibility: 'visible' },
      paint: { 'fill-color': '#00ff00', 'fill-opacity': 1 }
    }))
  })

  it('uses opacity from config in fill paint', () => {
    const map = makeMap()
    addFillLayer(map, { fill: '#00ff00', opacity: 0.5 }, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      paint: { 'fill-color': '#00ff00', 'fill-opacity': 0.5 }
    }))
  })

  it('adds a fill layer with fill-pattern paint when hasPattern is true', () => {
    const map = makeMap()
    hasPattern.mockReturnValue(true)
    addFillLayer(map, { fillPattern: 'dots', minZoom: 6 }, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      type: 'fill',
      paint: { 'fill-pattern': 'pattern-img-id', 'fill-opacity': 1 }
    }))
  })

  it('includes filter when config.filter is set', () => {
    const map = makeMap()
    const filter = ['==', 'type', 'polygon']
    addFillLayer(map, { fill: 'blue', filter }, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ filter }))
  })

  it('does not include filter key when config.filter is not set', () => {
    const map = makeMap()
    addFillLayer(map, { fill: 'blue' }, 'layer-id', 'source-id', undefined, 'visible', opts)
    const call = map.addLayer.mock.calls[0][0]
    expect(call).not.toHaveProperty('filter')
  })
})

// ─── addStrokeLayer ───────────────────────────────────────────────────────────

describe('addStrokeLayer', () => {
  it('does not add a layer when layerId is falsy', () => {
    const map = makeMap()
    addStrokeLayer(map, { stroke: 'red' }, null, 'source-id', undefined, 'visible', 'default')
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when config.stroke is absent', () => {
    const map = makeMap()
    addStrokeLayer(map, {}, 'layer-id', 'source-id', undefined, 'visible', 'default')
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when the layer already exists', () => {
    const map = makeMap({ hasLayer: true })
    addStrokeLayer(map, { stroke: 'red' }, 'layer-id', 'source-id', undefined, 'visible', 'default')
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('adds a line layer with stroke-derived paint', () => {
    const map = makeMap()
    addStrokeLayer(map, { stroke: '#ff0000', strokeWidth: 3, minZoom: 6, maxZoom: 18 }, 'layer-id', 'source-id', 'my-layer', 'visible', 'default')
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'layer-id',
      type: 'line',
      source: 'source-id',
      'source-layer': 'my-layer',
      layout: { visibility: 'visible' },
      paint: expect.objectContaining({
        'line-color': '#ff0000',
        'line-width': 3,
        'line-opacity': 1
      })
    }))
  })

  it('defaults strokeWidth to 1 and opacity to 1', () => {
    const map = makeMap()
    addStrokeLayer(map, { stroke: 'red' }, 'layer-id', 'source-id', undefined, 'visible', 'default')
    const paint = map.addLayer.mock.calls[0][0].paint
    expect(paint['line-width']).toBe(1)
    expect(paint['line-opacity']).toBe(1)
  })

  it('includes line-dasharray when strokeDashArray is provided', () => {
    const map = makeMap()
    addStrokeLayer(map, { stroke: 'red', strokeDashArray: [2, 4] }, 'layer-id', 'source-id', undefined, 'visible', 'default')
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      paint: expect.objectContaining({ 'line-dasharray': [2, 4] })
    }))
  })

  it('does not include line-dasharray when strokeDashArray is absent', () => {
    const map = makeMap()
    addStrokeLayer(map, { stroke: 'red' }, 'layer-id', 'source-id', undefined, 'visible', 'default')
    const paint = map.addLayer.mock.calls[0][0].paint
    expect(paint).not.toHaveProperty('line-dasharray')
  })

  it('includes filter when config.filter is set', () => {
    const map = makeMap()
    const filter = ['==', 'class', 'road']
    addStrokeLayer(map, { stroke: 'red', filter }, 'layer-id', 'source-id', undefined, 'visible', 'default')
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ filter }))
  })

  it('does not include filter key when config.filter is not set', () => {
    const map = makeMap()
    addStrokeLayer(map, { stroke: 'red' }, 'layer-id', 'source-id', undefined, 'visible', 'default')
    const call = map.addLayer.mock.calls[0][0]
    expect(call).not.toHaveProperty('filter')
  })
})

// ─── addSymbolLayer ───────────────────────────────────────────────────────────

describe('addSymbolLayer', () => {
  const opts = { mapStyle: { id: 'default' }, symbolRegistry: {}, pixelRatio: 1 }

  it('does not add a layer when layerId is falsy', () => {
    const map = makeMap()
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('img-id')
    addSymbolLayer(map, {}, null, 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when the layer already exists', () => {
    const map = makeMap({ hasLayer: true })
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('img-id')
    addSymbolLayer(map, {}, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when no symbolDef is found', () => {
    const map = makeMap()
    getSymbolDef.mockReturnValue(null)
    getSymbolImageId.mockReturnValue('img-id')
    addSymbolLayer(map, {}, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('does not add a layer when no imageId is resolved', () => {
    const map = makeMap()
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue(null)
    addSymbolLayer(map, {}, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).not.toHaveBeenCalled()
  })

  it('adds a symbol layer when symbolDef and imageId are available', () => {
    const map = makeMap()
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('marker-img')
    getSymbolAnchor.mockReturnValue('bottom')
    anchorToMaplibre.mockReturnValue('bottom')
    addSymbolLayer(map, { minZoom: 6, maxZoom: 18 }, 'layer-id', 'source-id', 'tiles-layer', 'visible', opts)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({
      id: 'layer-id',
      type: 'symbol',
      source: 'source-id',
      'source-layer': 'tiles-layer',
      layout: expect.objectContaining({
        visibility: 'visible',
        'icon-image': 'marker-img',
        'icon-anchor': 'bottom',
        'icon-allow-overlap': true
      })
    }))
  })

  it('includes filter when dataset.filter is set', () => {
    const map = makeMap()
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('marker-img')
    const filter = ['==', 'type', 'point']
    addSymbolLayer(map, { filter }, 'layer-id', 'source-id', undefined, 'visible', opts)
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ filter }))
  })

  it('does not include filter key when dataset.filter is not set', () => {
    const map = makeMap()
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('marker-img')
    addSymbolLayer(map, {}, 'layer-id', 'source-id', undefined, 'visible', opts)
    const call = map.addLayer.mock.calls[0][0]
    expect(call).not.toHaveProperty('filter')
  })
})

// ─── addSublayerLayers ────────────────────────────────────────────────────────

describe('addSublayerLayers', () => {
  const mapStyle = { id: 'default' }
  const symbolRegistry = {}
  const patternRegistry = {}

  it('merges the sublayer into the dataset before building layers', () => {
    const map = makeMap()
    const dataset = { id: 'ds', visibility: 'visible', fill: 'blue' }
    const sublayer = { id: 'sl', fill: 'red' }
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry, patternRegistry, pixelRatio: 1 })
    expect(mergeSublayer).toHaveBeenCalledWith(dataset, sublayer)
  })

  it('uses getSublayerLayerIds to generate layer IDs', () => {
    const map = makeMap()
    const dataset = { id: 'ds', visibility: 'visible' }
    const sublayer = { id: 'sl' }
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry, patternRegistry, pixelRatio: 1 })
    expect(getSublayerLayerIds).toHaveBeenCalledWith('ds', 'sl')
  })

  it('sets visibility to none when parent dataset is hidden', () => {
    const map = makeMap()
    const dataset = { id: 'ds', visibility: 'hidden', fill: 'blue' }
    const sublayer = { id: 'sl', fill: 'red' }
    mergeSublayer.mockReturnValue({ ...dataset, ...sublayer })
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry, patternRegistry, pixelRatio: 1 })
    const call = map.addLayer.mock.calls[0]?.[0]
    expect(call?.layout?.visibility ?? 'none').toBe('none')
  })

  it('sets visibility to none when the sublayer itself is hidden', () => {
    const map = makeMap()
    const dataset = { id: 'ds', visibility: 'visible', sublayerVisibility: { sl: 'hidden' }, fill: 'blue' }
    const sublayer = { id: 'sl', fill: 'red' }
    mergeSublayer.mockReturnValue({ fill: 'red' })
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry, patternRegistry, pixelRatio: 1 })
    const call = map.addLayer.mock.calls[0]?.[0]
    expect(call?.layout?.visibility ?? 'none').toBe('none')
  })

  it('delegates to addSymbolLayer when hasSymbol and symbolRegistry are available', () => {
    const map = makeMap()
    hasSymbol.mockReturnValue(true)
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('marker-img')
    const dataset = { id: 'ds', visibility: 'visible' }
    const sublayer = { id: 'sl' }
    mergeSublayer.mockReturnValue({ symbol: 'marker' })
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry, patternRegistry, pixelRatio: 1 })
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ type: 'symbol' }))
  })

  it('falls back to fill+stroke layers when no symbolRegistry is provided', () => {
    const map = makeMap()
    hasSymbol.mockReturnValue(true)
    const dataset = { id: 'ds', visibility: 'visible' }
    const sublayer = { id: 'sl', fill: 'blue', stroke: 'red' }
    mergeSublayer.mockReturnValue({ fill: 'blue', stroke: 'red' })
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry: undefined, patternRegistry, pixelRatio: 1 })
    const layerTypes = map.addLayer.mock.calls.map(([layer]) => layer.type)
    expect(layerTypes).not.toContain('symbol')
  })

  it('adds fill and stroke layers for non-symbol sublayers', () => {
    const map = makeMap()
    const dataset = { id: 'ds', visibility: 'visible' }
    const sublayer = { id: 'sl', fill: 'blue', stroke: 'red' }
    mergeSublayer.mockReturnValue({ fill: 'blue', stroke: 'red' })
    addSublayerLayers(map, dataset, sublayer, 'source-id', undefined, { mapStyle, symbolRegistry, patternRegistry, pixelRatio: 1 })
    const layerTypes = map.addLayer.mock.calls.map(([layer]) => layer.type)
    expect(layerTypes).toContain('fill')
    expect(layerTypes).toContain('line')
  })
})

// ─── addDatasetLayers ─────────────────────────────────────────────────────────

describe('addDatasetLayers', () => {
  const mapStyle = { id: 'default' }

  it('returns the sourceId', () => {
    const map = makeMap()
    const dataset = { id: 'ds', fill: 'blue', stroke: 'red' }
    const result = addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    expect(result).toBe('source-id')
  })

  it('calls addSource with the dataset and source id', () => {
    const map = makeMap()
    const dataset = { id: 'ds', geojson: { type: 'FeatureCollection', features: [] } }
    addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    expect(map.addSource).toHaveBeenCalledWith('source-id', expect.objectContaining({ type: 'geojson' }))
  })

  it('adds fill and stroke layers for a basic dataset', () => {
    const map = makeMap()
    const dataset = { id: 'ds', fill: 'blue', stroke: 'red', visibility: 'visible' }
    addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    const types = map.addLayer.mock.calls.map(([l]) => l.type)
    expect(types).toContain('fill')
    expect(types).toContain('line')
  })

  it('adds a symbol layer instead of fill/stroke when dataset has a symbol', () => {
    const map = makeMap()
    hasSymbol.mockReturnValue(true)
    getSymbolDef.mockReturnValue({ id: 'marker' })
    getSymbolImageId.mockReturnValue('marker-img')
    const dataset = { id: 'ds', symbol: 'marker', visibility: 'visible' }
    addDatasetLayers(map, dataset, mapStyle, {}, undefined, 1)
    const types = map.addLayer.mock.calls.map(([l]) => l.type)
    expect(types).toContain('symbol')
    expect(types).not.toContain('fill')
    expect(types).not.toContain('line')
  })

  it('sets visibility to none when dataset.visibility is hidden', () => {
    const map = makeMap()
    const dataset = { id: 'ds', fill: 'blue', visibility: 'hidden' }
    addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    const fillLayer = map.addLayer.mock.calls.find(([l]) => l.type === 'fill')?.[0]
    expect(fillLayer?.layout?.visibility).toBe('none')
  })

  it('iterates sublayers when dataset.sublayers is present', () => {
    const map = makeMap()
    const sublayers = [
      { id: 'sl1', fill: 'blue', stroke: 'red' },
      { id: 'sl2', fill: 'green', stroke: 'black' }
    ]
    const dataset = { id: 'ds', visibility: 'visible', sublayers }
    mergeSublayer.mockImplementation((_ds, sl) => sl)
    addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    expect(getSublayerLayerIds).toHaveBeenCalledTimes(2)
  })

  it('uses undefined sourceLayer for geojson datasets', () => {
    const map = makeMap()
    const dataset = { id: 'ds', geojson: { type: 'FeatureCollection', features: [] }, fill: 'blue', visibility: 'visible' }
    addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    const fillCall = map.addLayer.mock.calls.find(([l]) => l.type === 'fill')?.[0]
    expect(fillCall?.['source-layer']).toBeUndefined()
  })

  it('uses the dataset sourceLayer for tiled datasets', () => {
    const map = makeMap()
    const dataset = { id: 'ds', tiles: ['https://tiles.example.com/{z}/{x}/{y}'], sourceLayer: 'buildings', fill: 'blue', stroke: 'red', visibility: 'visible' }
    addDatasetLayers(map, dataset, mapStyle, undefined, undefined, 1)
    const fillCall = map.addLayer.mock.calls.find(([l]) => l.type === 'fill')?.[0]
    expect(fillCall?.['source-layer']).toBe('buildings')
  })
})
