import { OpenLayersDataset } from './openLayersDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { symbolRegistry } from '../../../../../../src/services/symbolRegistry.js'
import { registerSymbol, clearSymbolImageCache } from '../../../../../../providers/beta/openlayers/src/utils/symbolImages.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('../../../registry/datasetRegistry.js')

// The map's own pixelRatio — symbols are rasterised at it and drawn 1:1 (icon-scale 1 / ratio)
const PIXEL_RATIO = 2

beforeAll(() => {
  globalThis.Image = class {
    constructor (w, h) { this.width = w; this.height = h; this._src = '' }
    get src () { return this._src }
    set src (val) { this._src = val; this.onload?.() }
  }
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn((_x, _y, w, h) => ({ width: w, height: h })),
    putImageData: jest.fn()
  }))
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock')
})

describe('OpenLayersDataset', () => {
  beforeEach(() => {
    datasetRegistry.attachCreateDataset(def => new OpenLayersDataset(def))
    datasetRegistry.mockExtend({
      'ds-fill-only': { id: 'ds-fill-only', style: { fill: 'blue' } },
      'ds-stroke-only': { id: 'ds-stroke-only', style: { stroke: 'red', strokeWidth: 2 } },
      'ds-dashed-stroke': { id: 'ds-dashed-stroke', style: { stroke: 'red', strokeDashArray: [4, 2] } },
      'ds-transparent-fill': { id: 'ds-transparent-fill', style: { fill: 'transparent' } },
      'ds-bare': { id: 'ds-bare' },
      'ds-tiles': { id: 'ds-tiles', tiles: ['https://example.com/{z}/{x}/{y}'], minZoom: 5, maxZoom: 15 },
      'ds-tiles-no-zoom': { id: 'ds-tiles-no-zoom', tiles: ['https://example.com/{z}/{x}/{y}'] },
      'ds-static-geojson': { id: 'ds-static-geojson', geojson: { type: 'FeatureCollection', features: [] }, style: { fill: 'green' } },
      'ds-id-prop': { id: 'ds-id-prop', idProperty: 'ref', geojson: { type: 'FeatureCollection', features: [] } },
      'ds-hf': { id: 'ds-hf', style: { fill: 'blue' }, hiddenFeatures: [1, 2] },
      'ds-pattern': { id: 'ds-pattern', style: { fillPattern: 'dot', fillPatternForegroundColor: 'red' } },
      'ds-symbol': { id: 'ds-symbol', style: { symbol: 'pin' } },
      'ds-symbol-unknown': { id: 'ds-symbol-unknown', style: { symbol: 'not-a-real-symbol' } },
      'ds-symbol-anchor': { id: 'ds-symbol-anchor', style: { symbol: 'pin', symbolAnchor: [0.5, 1] } },
      'ds-symbol-filter': { id: 'ds-symbol-filter', style: { symbol: 'pin' }, filter: ['==', ['get', 'type'], 'a'] }
    })
    clearSymbolImageCache()
  })

  describe('leafLayerIds', () => {
    it('returns [id] for a dataset with a fill', () => {
      expect(datasetRegistry.getDataset('ds-fill-only').leafLayerIds).toEqual(['ds-fill-only'])
    })

    it('returns [id] for a dataset with only a stroke', () => {
      expect(datasetRegistry.getDataset('ds-stroke-only').leafLayerIds).toEqual(['ds-stroke-only'])
    })

    it('returns [] when fill is transparent and there is no stroke or symbol', () => {
      expect(datasetRegistry.getDataset('ds-transparent-fill').leafLayerIds).toEqual([])
    })

    it('returns [] for a dataset with no fill, stroke, or symbol', () => {
      expect(datasetRegistry.getDataset('ds-bare').leafLayerIds).toEqual([])
    })

    it('returns [] for a dataset with sublayers', () => {
      const parentDef = { id: 'parent', sublayerIds: ['child'] }
      const childDef = { id: 'child', parentId: 'parent', style: { fill: 'blue' } }
      datasetRegistry.attach({ parent: parentDef, child: childDef })
      expect(datasetRegistry.getDataset('parent').leafLayerIds).toEqual([])
    })

    it('returns [id] for a dataset with a symbol', () => {
      expect(datasetRegistry.getDataset('ds-symbol').leafLayerIds).toEqual(['ds-symbol'])
    })
  })

  describe('source', () => {
    it('returns a vector source descriptor for a tile dataset', () => {
      expect(datasetRegistry.getDataset('ds-tiles').source).toEqual({
        type: 'vector',
        tiles: ['https://example.com/{z}/{x}/{y}'],
        minzoom: 5,
        maxzoom: 15
      })
    })

    it('falls back to 0/22 for minzoom/maxzoom when zoom is not set', () => {
      expect(datasetRegistry.getDataset('ds-tiles-no-zoom').source).toEqual({
        type: 'vector',
        tiles: ['https://example.com/{z}/{x}/{y}'],
        minzoom: 0,
        maxzoom: 22
      })
    })

    it('returns a geojson source for a static geojson dataset', () => {
      const dataset = datasetRegistry.getDataset('ds-static-geojson')
      expect(dataset.source).toEqual({ type: 'geojson', data: dataset.geojson })
    })

    it('returns null when there are no tiles and no geojson', () => {
      expect(datasetRegistry.getDataset('ds-bare').source).toBeNull()
    })
  })

  describe('idStrategy', () => {
    it('returns the idProperty when set', () => {
      expect(datasetRegistry.getDataset('ds-id-prop').idStrategy).toBe('ref')
    })

    it('returns null when idProperty is not set', () => {
      expect(datasetRegistry.getDataset('ds-bare').idStrategy).toBeNull()
    })

    it('reads idProperty off dynamicGeoJSON, not the dataset itself, for a dynamic dataset', () => {
      datasetRegistry.mockExtend({
        'ds-dynamic-id-prop': { id: 'ds-dynamic-id-prop', dynamicGeoJSON: { url: 'https://example.com', idProperty: 'ref' } }
      })
      expect(datasetRegistry.getDataset('ds-dynamic-id-prop').idStrategy).toBe('ref')
    })

    it('returns null for a dynamic dataset with no idProperty on its dynamicGeoJSON config', () => {
      datasetRegistry.mockExtend({
        'ds-dynamic-no-id-prop': { id: 'ds-dynamic-no-id-prop', dynamicGeoJSON: { url: 'https://example.com' } }
      })
      expect(datasetRegistry.getDataset('ds-dynamic-no-id-prop').idStrategy).toBeNull()
    })
  })

  describe('filter (sourceLayer)', () => {
    // mockExtend rebuilds the whole registry from the demo dataset baseline + whatever's given
    // here, so this file's own top-level fixtures (e.g. ds-hf) aren't present in this nested
    // block unless re-declared alongside these — hence ds-geojson-hidden below, rather than
    // reusing ds-hf, to cover the "no sourceLayer" case.
    beforeEach(() => {
      datasetRegistry.mockExtend({
        'ds-tiles-sourcelayer': { id: 'ds-tiles-sourcelayer', tiles: ['https://example.com/{z}/{x}/{y}'], sourceLayer: 'field_parcels_osgb36', style: { fill: 'blue' } },
        'ds-tiles-sourcelayer-and-filter': { id: 'ds-tiles-sourcelayer-and-filter', tiles: ['https://example.com/{z}/{x}/{y}'], sourceLayer: 'field_parcels_osgb36', filter: ['==', ['get', 'sbi'], '123'], style: { fill: 'blue' } },
        'ds-tiles-sourcelayer-hidden': { id: 'ds-tiles-sourcelayer-hidden', tiles: ['https://example.com/{z}/{x}/{y}'], sourceLayer: 'field_parcels_osgb36', hiddenFeatures: [1, 2], style: { fill: 'blue' } },
        'ds-geojson-hidden': { id: 'ds-geojson-hidden', style: { fill: 'blue' }, hiddenFeatures: [1, 2] }
      })
    })

    it('is just the sourceLayer check when there is no own filter or hidden features', () => {
      expect(datasetRegistry.getDataset('ds-tiles-sourcelayer').filter).toEqual(['==', ['get', 'layer'], 'field_parcels_osgb36'])
    })

    it('folds the sourceLayer check into an "all" alongside an own filter', () => {
      expect(datasetRegistry.getDataset('ds-tiles-sourcelayer-and-filter').filter).toEqual([
        'all',
        ['==', ['get', 'sbi'], '123'],
        ['==', ['get', 'layer'], 'field_parcels_osgb36']
      ])
    })

    it('folds the sourceLayer check into an "all" alongside a hidden-features filter', () => {
      expect(datasetRegistry.getDataset('ds-tiles-sourcelayer-hidden').filter).toEqual([
        'all',
        ['!', ['in', ['to-string', ['id']], ['literal', ['1', '2']]]],
        ['==', ['get', 'layer'], 'field_parcels_osgb36']
      ])
    })

    it('is unaffected for a dataset with no sourceLayer (geojson)', () => {
      expect(datasetRegistry.getDataset('ds-geojson-hidden').filter).toEqual(['!', ['in', ['to-string', ['id']], ['literal', ['1', '2']]]])
    })
  })

  describe('getSymbolMeta', () => {
    it('returns null for a dataset with no symbol', () => {
      expect(datasetRegistry.getDataset('ds-fill-only').getSymbolMeta(PIXEL_RATIO)).toBeNull()
    })

    it('returns null when the style\'s symbol name has no known symbol definition', () => {
      expect(datasetRegistry.getDataset('ds-symbol-unknown').getSymbolMeta(PIXEL_RATIO)).toBeNull()
    })

    it('returns the resolved imageId and anchor for a known symbol, with no registration needed', () => {
      expect(datasetRegistry.getDataset('ds-symbol').getSymbolMeta(PIXEL_RATIO)).toEqual({
        imageId: expect.any(String),
        anchor: [0.5, 0.889], // pin's own default anchor at medium
        pixelRatio: PIXEL_RATIO
      })
    })

    it('uses the dataset\'s own symbolAnchor over the symbol definition\'s default', () => {
      expect(datasetRegistry.getDataset('ds-symbol-anchor').getSymbolMeta(PIXEL_RATIO).anchor).toEqual([0.5, 1])
    })
  })

  describe('getFlatStyle', () => {
    it('returns fill-color for a fill-only dataset', () => {
      expect(datasetRegistry.getDataset('ds-fill-only').getFlatStyle(PIXEL_RATIO)).toEqual({ 'fill-color': 'blue' })
    })

    it('returns stroke-color and stroke-width, defaulting stroke-width to 1', () => {
      expect(datasetRegistry.getDataset('ds-stroke-only').getFlatStyle(PIXEL_RATIO)).toEqual({ 'stroke-color': 'red', 'stroke-width': 2 })
    })

    it('includes stroke-line-dash when strokeDashArray is set', () => {
      expect(datasetRegistry.getDataset('ds-dashed-stroke').getFlatStyle(PIXEL_RATIO)).toEqual({
        'stroke-color': 'red',
        'stroke-width': 1,
        'stroke-line-dash': [4, 2]
      })
    })

    it('returns an empty style object for a bare dataset', () => {
      expect(datasetRegistry.getDataset('ds-bare').getFlatStyle(PIXEL_RATIO)).toEqual({})
    })

    it('wraps the style in a filter rule when the dataset has hidden features', () => {
      expect(datasetRegistry.getDataset('ds-hf').getFlatStyle(PIXEL_RATIO)).toEqual([{
        filter: ['!', ['in', ['to-string', ['id']], ['literal', ['1', '2']]]],
        style: { 'fill-color': 'blue' }
      }])
    })

    describe('pattern fills', () => {
      // A pattern fill is built by canvasPatternStyle.js's crisp CanvasPattern-based style
      // instead (see layerBuilders.js's resolveLayerStyle) — getFlatStyle never resolves one, and
      // must not fall back to a meaningless fill-color either (see base Dataset.hasFill, which
      // is also true for a pattern dataset).
      it('never sets fill-color or fill-pattern-src for a pattern dataset', () => {
        expect(datasetRegistry.getDataset('ds-pattern').getFlatStyle(PIXEL_RATIO)).toEqual({})
      })
    })

    describe('symbols', () => {
      it('has no icon-src before the symbol is registered', () => {
        // registerSymbol is async and hasn't run yet — getFlatStyle must never block on it.
        expect(datasetRegistry.getDataset('ds-symbol').getFlatStyle(PIXEL_RATIO)).toEqual({})
      })

      it('uses icon-src, icon-anchor and icon-scale once the symbol is registered', async () => {
        const dataset = datasetRegistry.getDataset('ds-symbol')
        await registerSymbol(dataset.style, undefined, symbolRegistry, PIXEL_RATIO)
        expect(dataset.getFlatStyle(PIXEL_RATIO)).toEqual({
          'icon-src': 'data:image/png;base64,mock',
          'icon-anchor': [0.5, 0.889], // pin's own default anchor at medium
          'icon-scale': 1 / PIXEL_RATIO
        })
      })

      it('uses the dataset\'s own symbolAnchor over the symbol definition\'s default', async () => {
        const dataset = datasetRegistry.getDataset('ds-symbol-anchor')
        await registerSymbol(dataset.style, undefined, symbolRegistry, PIXEL_RATIO)
        expect(dataset.getFlatStyle(PIXEL_RATIO)['icon-anchor']).toEqual([0.5, 1])
      })

      it('only finds the image registered at the same pixelRatio', async () => {
        const dataset = datasetRegistry.getDataset('ds-symbol')
        await registerSymbol(dataset.style, undefined, symbolRegistry, PIXEL_RATIO)
        expect(dataset.getFlatStyle(PIXEL_RATIO + 1)).toEqual({})
      })

      it('wraps icon style in a filter rule when the dataset has one', async () => {
        const dataset = datasetRegistry.getDataset('ds-symbol-filter')
        await registerSymbol(dataset.style, undefined, symbolRegistry, PIXEL_RATIO)
        expect(dataset.getFlatStyle(PIXEL_RATIO)).toEqual([{
          filter: ['==', ['get', 'type'], 'a'],
          style: {
            'icon-src': 'data:image/png;base64,mock',
            'icon-anchor': [0.5, 0.889],
            'icon-scale': 1 / PIXEL_RATIO
          }
        }])
      })
    })
  })
})
