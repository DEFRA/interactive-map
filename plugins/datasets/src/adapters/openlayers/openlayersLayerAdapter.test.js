import OpenLayersLayerAdapter from './openlayersLayerAdapter.js'
import { datasetRegistry } from '../../registry/datasetRegistry.js'
import { patternRegistry } from '../../../../../src/services/patternRegistry.js'
import { symbolRegistry } from '../../../../../src/services/symbolRegistry.js'
import { logger } from '../../../../../src/services/logger.js'
import { clearSymbolImageCache } from '../../../../../providers/beta/openlayers/src/utils/symbolImages.js'
import VectorLayer from 'ol/layer/Vector.js'
import VectorTileLayer from 'ol/layer/VectorTile.js'
import * as layerBuilders from './layerBuilders.js'

jest.mock('../../registry/datasetRegistry.js')

// The mocked datasetRegistry's beforeEach attaches full demo data alongside this file's own
// fixtures (see __mocks__/datasetRegistry.js), and demo data includes real fillPattern configs
// — so pattern registration needs the real patternRegistry singleton, not an empty stub, even
// though none of this file's own fixtures configure a pattern themselves.
beforeEach(() => {
  clearSymbolImageCache()
  // Covers the full pipeline exercised here: SVG -> Image -> canvas (rasteriseToImageData needs
  // drawImage/getImageData) -> ImageData -> canvas (getOrCreateSymbolImage needs putImageData;
  // canvasPatternStyle's crisp-pattern Fill needs createPattern).
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn((_x, _y, w, h) => ({ width: w, height: h })),
    putImageData: jest.fn(),
    createPattern: jest.fn(() => ({}))
  }))
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock')
  globalThis.Image = class {
    constructor (w, h) { this.width = w; this.height = h; this._src = '' }
    get src () { return this._src }
    set src (val) { this._src = val; this.onload?.() }
  }
})

const point = (id, coords) => ({ type: 'Feature', id, properties: {}, geometry: { type: 'Point', coordinates: coords } })

const makeMap = (pixelRatio = 1) => {
  const layers = new Set()
  return {
    layers,
    addLayer: jest.fn(layer => layers.add(layer)),
    removeLayer: jest.fn(layer => layers.delete(layer)),
    getPixelRatio: jest.fn(() => pixelRatio)
  }
}

const makeMapProvider = (map) => ({ map })

let map, mapProvider, adapter

beforeEach(() => {
  map = makeMap()
  mapProvider = makeMapProvider(map)
  adapter = new OpenLayersLayerAdapter(mapProvider, symbolRegistry, patternRegistry)
  datasetRegistry.attachCreateDataset(adapter.createDataset)
  datasetRegistry.mockExtend({
    'ds-fill': { id: 'ds-fill', style: { fill: '#0000ff' }, geojson: { type: 'FeatureCollection', features: [point(1, [0, 0])] } },
    'ds-bare': { id: 'ds-bare' },
    'ds-tiles': { id: 'ds-tiles', tiles: ['https://example.com/{z}/{x}/{y}'], style: { fill: '#0000ff' } },
    'ds-tiles-bare': { id: 'ds-tiles-bare', tiles: ['https://example.com/{z}/{x}/{y}'] },
    'ds-dynamic': { id: 'ds-dynamic', style: { fill: '#0000ff' }, dynamicGeoJSON: { url: 'https://example.com', idProperty: 'ref' } },
    'ds-parent': { id: 'ds-parent', sublayerIds: ['ds-child-a', 'ds-child-b'], geojson: { type: 'FeatureCollection', features: [point(1, [0, 0])] } },
    'ds-child-a': { id: 'ds-child-a', parentId: 'ds-parent', style: { fill: '#ff0000' }, filter: ['==', ['get', 'cat'], 'a'] },
    'ds-child-b': { id: 'ds-child-b', parentId: 'ds-parent', style: { fill: '#00ff00' }, filter: ['==', ['get', 'cat'], 'b'] },
    'ds-pattern': { id: 'ds-pattern', style: { fillPattern: 'dot' }, geojson: { type: 'FeatureCollection', features: [] } },
    'ds-symbol': { id: 'ds-symbol', style: { symbol: 'pin' }, geojson: { type: 'FeatureCollection', features: [point(1, [0, 0])] } },
    // Two top-level datasets pointing at the same tiles URL share one OL source by sourceId
    // (see layerBuilders.js's createDatasetSource) — mirrors the real demo's
    // existing-fields/hedge-control pair, both reading field_parcels_with_hedges_*.
    'ds-tiles-shared-a': { id: 'ds-tiles-shared-a', tiles: ['https://example.com/shared/{z}/{x}/{y}'], sourceLayer: 'layer-a', style: { fill: '#0000ff' } },
    'ds-tiles-shared-b': { id: 'ds-tiles-shared-b', tiles: ['https://example.com/shared/{z}/{x}/{y}'], sourceLayer: 'layer-b', style: { fill: '#ff0000' } }
  })
})

// createDatasetLayer doesn't tag layers with the dataset id, so tests read a specific layer
// back from the adapter's private map instead of the fake map's Set.
const getLayer = (id) => adapter._layersById.get(id)

describe('init / addDataset', () => {
  it('adds a layer for a dataset with a fill', async () => {
    await adapter.init()
    expect(getLayer('ds-fill')).toBeInstanceOf(VectorLayer)
    expect(map.addLayer).toHaveBeenCalledWith(getLayer('ds-fill'))
  })

  it('skips a dataset with no fill, stroke, or symbol', async () => {
    await adapter.init()
    expect(getLayer('ds-bare')).toBeUndefined()
  })

  it('adds a VectorTileLayer for a tiles-backed dataset with a renderable style', async () => {
    await adapter.init()
    expect(getLayer('ds-tiles')).toBeInstanceOf(VectorTileLayer)
  })

  it('skips a tiles-backed dataset with no fill, stroke, or symbol (nothing to render, not a tiles limitation)', async () => {
    await adapter.init()
    expect(getLayer('ds-tiles-bare')).toBeUndefined()
  })

  it('adds one layer per sublayer, sharing one OL source', async () => {
    await adapter.init()
    const layerA = getLayer('ds-child-a')
    const layerB = getLayer('ds-child-b')
    expect(layerA).toBeInstanceOf(VectorLayer)
    expect(layerB).toBeInstanceOf(VectorLayer)
    expect(layerA.getSource()).toBe(layerB.getSource())
  })

  it('addDataset adds a single dataset after init', async () => {
    await adapter.addDataset('ds-fill')
    expect(getLayer('ds-fill')).toBeInstanceOf(VectorLayer)
  })

  it('addDataset is a no-op for an unknown dataset id', async () => {
    await expect(adapter.addDataset('does-not-exist')).resolves.toBeUndefined()
  })
})

describe('removeDataset', () => {
  it('removes the layer and source for a simple dataset', async () => {
    await adapter.addDataset('ds-fill')
    const layer = getLayer('ds-fill')
    adapter.removeDataset('ds-fill')
    expect(map.removeLayer).toHaveBeenCalledWith(layer)
    expect(getLayer('ds-fill')).toBeUndefined()
  })

  it('removes all sublayer layers when removing the parent', async () => {
    await adapter.addDataset('ds-parent')
    adapter.removeDataset('ds-parent')
    expect(getLayer('ds-child-a')).toBeUndefined()
    expect(getLayer('ds-child-b')).toBeUndefined()
  })

  it('is a no-op for an unknown dataset id', () => {
    expect(() => adapter.removeDataset('does-not-exist')).not.toThrow()
  })

  it('does not delete the shared source while another dataset still uses it', async () => {
    await adapter.addDataset('ds-tiles-shared-a')
    await adapter.addDataset('ds-tiles-shared-b')
    const sharedSource = getLayer('ds-tiles-shared-b').getSource()
    adapter.removeDataset('ds-tiles-shared-a')
    // If the shared source had been wrongly deleted, re-adding would build a brand new one
    // instead of reusing the source ds-tiles-shared-b's own layer is still attached to.
    await adapter.addDataset('ds-tiles-shared-a')
    expect(getLayer('ds-tiles-shared-a').getSource()).toBe(sharedSource)
  })

  it('skips a layer id that never got built, rather than calling removeLayer(undefined)', async () => {
    const buildSourceSpy = jest.spyOn(layerBuilders, 'createDatasetSource').mockImplementationOnce(() => { throw new Error('boom') })
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    await adapter.addDataset('ds-fill') // fails to build — never added to the adapter's own layer map
    expect(() => adapter.removeDataset('ds-fill')).not.toThrow()
    expect(map.removeLayer).not.toHaveBeenCalled()
    buildSourceSpy.mockRestore()
    warnSpy.mockRestore()
  })
})

describe('setData', () => {
  it('replaces the features on the dataset source', async () => {
    await adapter.addDataset('ds-dynamic')
    adapter.setData('ds-dynamic', { type: 'FeatureCollection', features: [point('f1', [1, 1]), point('f2', [2, 2])] })
    expect(getLayer('ds-dynamic').getSource().getFeatures()).toHaveLength(2)
  })

  it('promotes idProperty onto feature ids', async () => {
    await adapter.addDataset('ds-dynamic')
    adapter.setData('ds-dynamic', { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { ref: 'abc' }, geometry: { type: 'Point', coordinates: [1, 1] } }] })
    expect(getLayer('ds-dynamic').getSource().getFeatures()[0].getId()).toBe('abc')
  })

  it('clears existing features and adds none when the new geojson has no features', async () => {
    await adapter.addDataset('ds-dynamic')
    adapter.setData('ds-dynamic', { type: 'FeatureCollection', features: [point('f1', [1, 1])] })
    expect(getLayer('ds-dynamic').getSource().getFeatures()).toHaveLength(1)
    adapter.setData('ds-dynamic', { type: 'FeatureCollection', features: [] })
    expect(getLayer('ds-dynamic').getSource().getFeatures()).toHaveLength(0)
  })

  it('is a no-op for a dataset with no tracked source', () => {
    expect(() => adapter.setData('does-not-exist', { type: 'FeatureCollection', features: [] })).not.toThrow()
  })
})

describe('opacity', () => {
  it('applyDatasetOpacity sets the layer opacity', async () => {
    await adapter.addDataset('ds-fill')
    datasetRegistry.mockExtend({ 'ds-fill': { id: 'ds-fill', style: { fill: '#0000ff', opacity: 0.4 }, geojson: { type: 'FeatureCollection', features: [] } } })
    adapter.applyDatasetOpacity('ds-fill')
    expect(getLayer('ds-fill').getOpacity()).toBe(0.4)
  })

  it('applyDatasetOpacity is a no-op for an unknown dataset id', () => {
    expect(() => adapter.applyDatasetOpacity('does-not-exist')).not.toThrow()
  })

  it('applyGlobalOpacity updates every tracked layer', async () => {
    await adapter.addDataset('ds-parent')
    // A second mockExtend call replaces the whole registry with {pristine demo data, ...extras}
    // rather than layering onto the previous mockExtend — so ds-parent must be included again
    // here, or forEachDataset (which only walks top-level datasets) would skip its children.
    datasetRegistry.mockExtend({
      'ds-parent': { id: 'ds-parent', sublayerIds: ['ds-child-a', 'ds-child-b'] },
      'ds-child-a': { id: 'ds-child-a', parentId: 'ds-parent', style: { fill: '#ff0000', opacity: 0.2 } },
      'ds-child-b': { id: 'ds-child-b', parentId: 'ds-parent', style: { fill: '#00ff00', opacity: 0.6 } }
    })
    adapter.applyGlobalOpacity()
    expect(getLayer('ds-child-a').getOpacity()).toBe(0.2)
    expect(getLayer('ds-child-b').getOpacity()).toBe(0.6)
  })
})

describe('visibility', () => {
  it('applyDatasetVisibility hides the layer when visible is false', async () => {
    await adapter.addDataset('ds-fill')
    datasetRegistry.mockExtend({ 'ds-fill': { id: 'ds-fill', visible: false, style: { fill: '#0000ff' }, geojson: { type: 'FeatureCollection', features: [] } } })
    adapter.applyDatasetVisibility('ds-fill')
    expect(getLayer('ds-fill').getVisible()).toBe(false)
  })

  it('applyDatasetVisibility is a no-op for an unknown dataset id', () => {
    expect(() => adapter.applyDatasetVisibility('does-not-exist')).not.toThrow()
  })

  it('applyGlobalVisibility updates every tracked layer', async () => {
    await adapter.addDataset('ds-fill')
    datasetRegistry.mockExtend({
      'ds-fill': { id: 'ds-fill', visible: false, style: { fill: '#0000ff' }, geojson: { type: 'FeatureCollection', features: [] } }
    })
    adapter.applyGlobalVisibility()
    expect(getLayer('ds-fill').getVisible()).toBe(false)
  })
})

describe('applyFeatureFilter', () => {
  it('re-derives the flat style to reflect newly hidden features', async () => {
    await adapter.addDataset('ds-fill')
    datasetRegistry.mockExtend({ 'ds-fill': { id: 'ds-fill', style: { fill: '#0000ff' }, hiddenFeatures: [1], geojson: { type: 'FeatureCollection', features: [] } } })
    adapter.applyFeatureFilter('ds-fill')
    // the flat style now wraps in a filter rule — confirm the layer's style function reflects it by
    // checking the underlying style was re-set to the dataset's current (filtered) flat style.
    const registryDataset = datasetRegistry.getDataset('ds-fill')
    expect(getLayer('ds-fill').getStyle()).toBeDefined()
    expect(registryDataset.filter).not.toBeNull()
  })

  it('is a no-op for an unknown dataset id', () => {
    expect(() => adapter.applyFeatureFilter('does-not-exist')).not.toThrow()
  })
})

describe('applyStyle', () => {
  it('re-sets style on an existing layer', async () => {
    await adapter.addDataset('ds-fill')
    const layer = getLayer('ds-fill')
    const setStyleSpy = jest.spyOn(layer, 'setStyle')
    await adapter.applyStyle('ds-fill')
    expect(setStyleSpy).toHaveBeenCalled()
  })

  it('adds the layer when a previously bare dataset becomes renderable', async () => {
    await adapter.addDataset('ds-bare')
    expect(getLayer('ds-bare')).toBeUndefined()
    datasetRegistry.mockExtend({
      'ds-bare': { id: 'ds-bare', style: { fill: '#0000ff' }, geojson: { type: 'FeatureCollection', features: [] } }
    })
    await adapter.applyStyle('ds-bare')
    expect(getLayer('ds-bare')).toBeInstanceOf(VectorLayer)
  })

  it('is a no-op for an unknown dataset id', async () => {
    await expect(adapter.applyStyle('does-not-exist')).resolves.toBeUndefined()
  })
})

describe('robustness — malformed dataset config or a failed source/layer build', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('logs and leaves the existing layer in place when a restyle filter is invalid for OL\'s expression parser', async () => {
    // ol/style/flat's "in" operator requires a real array second argument, unlike MapLibre's own
    // filter dialect (which also accepts a bare scalar) — a hand-authored filter written for
    // MapLibre can hit this on restyle (applyFeatureFilter/applyStyle/onMapStyleChange all funnel
    // through _setLayerStyle), and one bad dataset's filter must not crash every other dataset.
    await adapter.addDataset('ds-fill')
    const layer = getLayer('ds-fill')
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    datasetRegistry.mockExtend({
      'ds-fill': { id: 'ds-fill', style: { fill: '#0000ff' }, filter: ['in', ['get', 'category'], 'a'], geojson: { type: 'FeatureCollection', features: [] } }
    })
    expect(() => adapter.applyFeatureFilter('ds-fill')).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('failed to build a style for dataset "ds-fill"'))
    expect(getLayer('ds-fill')).toBe(layer)
  })

  it('logs and skips a dataset whose source fails to build, without adding a layer for it', async () => {
    jest.spyOn(layerBuilders, 'createDatasetSource').mockImplementationOnce(() => { throw new Error('boom') })
    const warnSpy = jest.spyOn(logger, 'warn').mockImplementation(() => {})
    await expect(adapter.addDataset('ds-fill')).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('failed to build a source for dataset "ds-fill"'))
    expect(getLayer('ds-fill')).toBeUndefined()
  })

  it('does not stop other datasets from loading when one dataset\'s source build fails', async () => {
    jest.spyOn(layerBuilders, 'createDatasetSource').mockImplementationOnce(() => { throw new Error('boom') })
    jest.spyOn(logger, 'warn').mockImplementation(() => {})
    await adapter.init()
    expect(getLayer('ds-symbol')).toBeInstanceOf(VectorLayer)
  })
})

describe('onMapStyleChange', () => {
  it('re-sets style on every tracked layer without removing it', async () => {
    await adapter.addDataset('ds-fill')
    const layer = getLayer('ds-fill')
    const setStyleSpy = jest.spyOn(layer, 'setStyle')
    await adapter.onMapStyleChange()
    expect(setStyleSpy).toHaveBeenCalled()
    expect(map.removeLayer).not.toHaveBeenCalled()
  })
})

// A pattern dataset always goes through canvasPatternStyle.js's genuinely-crisp style FUNCTION
// (see layerBuilders.resolveLayerStyle).
describe('pattern registration', () => {
  it('registers a crisp canvas pattern before init() adds its layer, so its style is already resolved', async () => {
    await adapter.init()
    const styleFn = getLayer('ds-pattern').getStyle()
    expect(typeof styleFn).toBe('function')
    expect(styleFn({}).getFill().getColor()).toBeTruthy()
  })

  it('registers a crisp canvas pattern before addDataset() adds its layer', async () => {
    await adapter.addDataset('ds-pattern')
    const styleFn = getLayer('ds-pattern').getStyle()
    expect(styleFn({}).getFill().getColor()).toBeTruthy()
  })

  it('re-registers patterns for a newly-introduced pattern on applyStyle()', async () => {
    await adapter.addDataset('ds-fill')
    expect(getLayer('ds-fill').getStyle()).toEqual({ 'fill-color': '#0000ff' })
    datasetRegistry.mockExtend({
      'ds-fill': { id: 'ds-fill', style: { fillPattern: 'dot' }, geojson: { type: 'FeatureCollection', features: [] } }
    })
    await adapter.applyStyle('ds-fill')
    const styleFn = getLayer('ds-fill').getStyle()
    expect(typeof styleFn).toBe('function')
    expect(styleFn({}).getFill().getColor()).toBeTruthy()
  })

  it('re-registers patterns on onMapStyleChange() in case fg/bg colours are mapStyle-keyed', async () => {
    await adapter.addDataset('ds-pattern')
    const layer = getLayer('ds-pattern')
    const setStyleSpy = jest.spyOn(layer, 'setStyle')
    await adapter.onMapStyleChange()
    expect(setStyleSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('onMapSizeChange() re-registers and re-applies crisp canvas pattern styles, so they stay sized for the map\'s current pixelRatio', async () => {
    await adapter.addDataset('ds-pattern')
    const layer = getLayer('ds-pattern')
    const setStyleSpy = jest.spyOn(layer, 'setStyle')
    await adapter.onMapSizeChange()
    expect(setStyleSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('onMapSizeChange() re-rasterises symbols at the new pixelRatio so they stay drawn 1:1', async () => {
    await adapter.addDataset('ds-symbol')
    const layer = getLayer('ds-symbol')
    expect(layer.getStyle()).toMatchObject({ 'icon-scale': 1 })
    expect(layer.get('symbolMeta').pixelRatio).toBe(1)

    map.getPixelRatio.mockReturnValue(2)
    await adapter.onMapSizeChange()

    expect(layer.getStyle()).toMatchObject({ 'icon-src': 'data:image/png;base64,mock', 'icon-scale': 0.5 })
    expect(layer.get('symbolMeta').pixelRatio).toBe(2)
  })

  it('onMapSizeChange() does not touch a plain fill/stroke dataset\'s style', async () => {
    await adapter.addDataset('ds-fill')
    const layer = getLayer('ds-fill')
    const setStyleSpy = jest.spyOn(layer, 'setStyle')
    await adapter.onMapSizeChange()
    expect(setStyleSpy).not.toHaveBeenCalled()
  })
})

describe('symbol registration', () => {
  it('registers a symbol before init() adds its layer, so getFlatStyle already resolves it', async () => {
    await adapter.init()
    expect(getLayer('ds-symbol').getStyle()).toMatchObject({ 'icon-src': 'data:image/png;base64,mock' })
  })

  it('registers a symbol before addDataset() adds its layer', async () => {
    await adapter.addDataset('ds-symbol')
    expect(getLayer('ds-symbol').getStyle()).toMatchObject({ 'icon-src': 'data:image/png;base64,mock' })
  })

  it('re-registers a symbol for a newly-introduced one on applyStyle()', async () => {
    await adapter.addDataset('ds-fill')
    expect(getLayer('ds-fill').getStyle()).toEqual({ 'fill-color': '#0000ff' })
    datasetRegistry.mockExtend({
      'ds-fill': { id: 'ds-fill', style: { symbol: 'pin' }, geojson: { type: 'FeatureCollection', features: [] } }
    })
    await adapter.applyStyle('ds-fill')
    expect(getLayer('ds-fill').getStyle()).toMatchObject({ 'icon-src': 'data:image/png;base64,mock' })
  })

  it('re-registers symbols on onMapStyleChange() in case colours are mapStyle-keyed', async () => {
    await adapter.addDataset('ds-symbol')
    const layer = getLayer('ds-symbol')
    const setStyleSpy = jest.spyOn(layer, 'setStyle')
    await adapter.onMapStyleChange()
    expect(setStyleSpy).toHaveBeenCalledWith(expect.objectContaining({ 'icon-src': 'data:image/png;base64,mock' }))
  })

  // symbolMeta.imageId is only ever resolved for the 'normal' variant, but that's still
  // mapStyle-dependent (see registerSymbol's resolve() call) — so a stale, pre-switch id left
  // on the layer would make highlightFeatures.js's reverse-map keep resolving the OLD theme's
  // selected/active image forever, regardless of how many times the map style actually changes.
  it('refreshes symbolMeta on onMapStyleChange(), not just the layer\'s own style', async () => {
    await adapter.addDataset('ds-symbol')
    const layer = getLayer('ds-symbol')
    const before = layer.get('symbolMeta')
    const setSpy = jest.spyOn(layer, 'set')
    await adapter.onMapStyleChange()
    expect(setSpy).toHaveBeenCalledWith('symbolMeta', expect.objectContaining({ imageId: before?.imageId }))
  })
})

describe('destroy', () => {
  it('removes every tracked layer from the map', async () => {
    await adapter.addDataset('ds-fill')
    const layer = getLayer('ds-fill')
    adapter.destroy()
    expect(map.removeLayer).toHaveBeenCalledWith(layer)
  })
})
