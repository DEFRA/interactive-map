// MapLibreDataset must be imported before datasetRegistry to pre-warm the module cache,
// preventing a circular re-entry in the mock that would leave datasetRegistry undefined.
// eslint-disable-next-line no-unused-vars
import { MapLibreDataset } from './mapLibreDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { hashString, MAX_TILE_ZOOM } from '../layerIds.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('../../../registry/datasetRegistry.js')

describe('MapLibreDataset', () => {
  beforeEach(() => {
    datasetRegistry.attachCreateDataset(def => new MapLibreDataset(def))
    datasetRegistry.mockExtend({
      // layerIds
      'ds-fill-only': { id: 'ds-fill-only', style: { fill: 'blue' } },
      'ds-pattern-only': { id: 'ds-pattern-only', style: { fillPattern: 'dots' } },
      'ds-transparent-fill': { id: 'ds-transparent-fill', style: { fill: 'transparent' } },
      'ds-no-style': { id: 'ds-no-style', style: {} },
      // isDynamicSource
      'ds-is-dynamic': { id: 'ds-is-dynamic', geojson: 'https://example.com/data', idProperty: 'id', transformRequest: () => {}, style: {} },
      'ds-geojson-obj': { id: 'ds-geojson-obj', geojson: { type: 'FeatureCollection', features: [] }, idProperty: 'id', transformRequest: () => {}, style: {} },
      'ds-no-id-prop': { id: 'ds-no-id-prop', geojson: 'https://example.com/data', transformRequest: () => {}, style: {} },
      'ds-no-transform': { id: 'ds-no-transform', geojson: 'https://example.com/data', idProperty: 'id', style: {} },
      // visibility
      'ds-visible': { id: 'ds-visible', visible: true, style: {} },
      'ds-hidden': { id: 'ds-hidden', visible: false, style: {} },
      // getLayersWithFilters
      'ds-with-hidden': { id: 'ds-with-hidden', hiddenFeatures: [42], style: { stroke: '#ff0000', fill: 'blue' } },
      // sourceId / source
      'ds-string-tiles': { id: 'ds-string-tiles', tiles: 'https://example.com/{z}/{x}/{y}', style: {} },
      'ds-dynamic': { id: 'ds-dynamic', geojson: 'https://example.com/data', idProperty: 'gid', transformRequest: () => {}, style: {} },
      'ds-static-url': { id: 'ds-static-url', geojson: 'https://example.com/static.geojson', style: {} },
      'ds-bare': { id: 'ds-bare', style: {} },
      'ds-no-minzoom': { id: 'ds-no-minzoom', tiles: ['https://example.com/{z}/{x}/{y}'], style: {} },
      'ds-no-maxzoom': { id: 'ds-no-maxzoom', tiles: ['https://example.com/{z}/{x}/{y}'], style: {} },
      // getSymbolSource
      'ds-sym-no-filter': { id: 'ds-sym-no-filter', style: { symbol: 'circle' } },
      'ds-sym-filter': { id: 'ds-sym-filter', filter: ['==', ['get', 'type'], 'foo'], style: { symbol: 'circle' } },
      // getFillSource
      'ds-fill-filter': { id: 'ds-fill-filter', filter: ['==', ['get', 'cat'], 'a'], style: { fill: 'blue' } },
      // getStrokeSource
      'ds-stroke-filter': { id: 'ds-stroke-filter', filter: ['==', ['get', 'type'], 'b'], style: { stroke: '#ff0000' } },
      // _hiddenFeaturesIdExpression
      'ds-id-prop': { id: 'ds-id-prop', idProperty: 'gid', style: {} },
      'ds-no-id-expr': { id: 'ds-no-id-expr', style: {} },
      // _hiddenFeaturesFilter
      'ds-hf-123': { id: 'ds-hf-123', hiddenFeatures: [1, 2, 3], style: {} },
      'ds-hf-neg1': { id: 'ds-hf-neg1', hiddenFeatures: [-1, 5], style: {} },
      'ds-hf-all-neg1': { id: 'ds-hf-all-neg1', hiddenFeatures: [-1], style: {} },
      'ds-hf-empty': { id: 'ds-hf-empty', hiddenFeatures: [], style: {} },
      'ds-hf-none': { id: 'ds-hf-none', style: {} },
      // filter
      'ds-no-filter': { id: 'ds-no-filter', style: { stroke: '#ff0000' } },
      'ds-own-filter': { id: 'ds-own-filter', filter: ['==', ['get', 'type'], 'foo'], style: {} },
      'ds-hidden-only': { id: 'ds-hidden-only', hiddenFeatures: [10], style: {} },
      'ds-combined': { id: 'ds-combined', filter: ['==', ['get', 'type'], 'foo'], hiddenFeatures: [5], style: {} }
    })
  })

  describe('layerIds', () => {
    it('returns [id] when dataset has a symbol (historic-monuments-prehistoric inherits symbol from parent)', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments-prehistoric')
      expect(dataset.layerIds).toEqual(['historic-monuments-prehistoric'])
    })

    it('returns [id, id-stroke] when dataset has both fill and stroke (existing-fields)', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      expect(dataset.layerIds).toEqual(['existing-fields', 'existing-fields-stroke'])
    })

    it('returns [id] when dataset has only fill', () => {
      const dataset = datasetRegistry.getDataset('ds-fill-only')
      expect(dataset.layerIds).toEqual(['ds-fill-only'])
    })

    it('returns [id] when dataset has only stroke (hedge-control)', () => {
      const dataset = datasetRegistry.getDataset('hedge-control')
      expect(dataset.layerIds).toEqual(['hedge-control'])
    })

    it('returns [id] when dataset has a fillPattern but no stroke', () => {
      const dataset = datasetRegistry.getDataset('ds-pattern-only')
      expect(dataset.layerIds).toEqual(['ds-pattern-only'])
    })

    it('returns [id, id-stroke] when dataset has fillPattern and stroke (land-covers-130-131)', () => {
      const dataset = datasetRegistry.getDataset('land-covers-130-131')
      expect(dataset.layerIds).toEqual(['land-covers-130-131', 'land-covers-130-131-stroke'])
    })

    it('returns null when fill is transparent and there is no stroke, symbol, or pattern', () => {
      const dataset = datasetRegistry.getDataset('ds-transparent-fill')
      expect(dataset.layerIds).toEqual([])
    })

    it('returns null when dataset has no fill, stroke, symbol, or pattern', () => {
      const dataset = datasetRegistry.getDataset('ds-no-style')
      expect(dataset.layerIds).toEqual([])
    })

    it('returns the combined layerIds from all sublayers (historic-monuments)', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      expect(dataset.layerIds).toEqual([
        'historic-monuments-prehistoric',
        'historic-monuments-roman',
        'historic-monuments-medieval'
      ])
    })

    it('returns the combined layerIds from all sublayers (land-covers)', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.layerIds).toEqual([
        'land-covers-130-131', 'land-covers-130-131-stroke',
        'land-covers-332', 'land-covers-332-stroke',
        'land-covers-110', 'land-covers-110-stroke',
        'land-covers-379', 'land-covers-379-stroke',
        'land-covers-other', 'land-covers-other-stroke'
      ])
    })
  })

  describe('isDynamicSource', () => {
    it('returns true when geojson is a string, idProperty is set, and transformRequest is a function', () => {
      expect(datasetRegistry.getDataset('ds-is-dynamic').isDynamicSource).toBe(true)
    })

    it('returns false when geojson is an object', () => {
      expect(datasetRegistry.getDataset('ds-geojson-obj').isDynamicSource).toBe(false)
    })

    it('returns false when idProperty is missing', () => {
      expect(datasetRegistry.getDataset('ds-no-id-prop').isDynamicSource).toBe(false)
    })

    it('returns false when transformRequest is not a function', () => {
      expect(datasetRegistry.getDataset('ds-no-transform').isDynamicSource).toBe(false)
    })
  })

  describe('visibility', () => {
    it('returns "visible" when visible is true', () => {
      expect(datasetRegistry.getDataset('ds-visible').visibility).toBe('visible')
    })

    it('returns "none" when visible is false', () => {
      expect(datasetRegistry.getDataset('ds-hidden').visibility).toBe('none')
    })
  })

  describe('fillLayerId, strokeLayerId, symbolLayerId — hasSublayers returns null', () => {
    it('fillLayerId returns null for a dataset with sublayers', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.fillLayerId).toBeNull()
    })

    it('strokeLayerId returns null for a dataset with sublayers', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.strokeLayerId).toBeNull()
    })

    it('symbolLayerId returns null for a dataset with sublayers', () => {
      const dataset = datasetRegistry.getDataset('land-covers')
      expect(dataset.symbolLayerId).toBeNull()
    })
  })

  describe('getLayersWithFilters', () => {
    it('returns an empty array when there are no hidden features and no sublayers', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      expect(dataset.getLayersWithFilters()).toEqual([])
    })

    it('returns an entry with layerIds and filter when the dataset has hidden features', () => {
      const dataset = datasetRegistry.getDataset('ds-with-hidden')
      const result = dataset.getLayersWithFilters()
      expect(result).toHaveLength(1)
      expect(result[0].layerIds).toEqual(['ds-with-hidden', 'ds-with-hidden-stroke'])
      expect(result[0].filter).not.toBeNull()
    })

    it('includes sublayer entries when a sublayer has hidden features', () => {
      const parentDef = { id: 'parent-ds', sublayerIds: ['parent-ds-sub'], style: {} }
      const subDef = { id: 'parent-ds-sub', parentId: 'parent-ds', hiddenFeatures: [7], style: { stroke: '#ff0000' } }
      datasetRegistry.attach({ 'parent-ds': parentDef, 'parent-ds-sub': subDef })
      const dataset = datasetRegistry.getDataset('parent-ds')
      const result = dataset.getLayersWithFilters()
      expect(result).toHaveLength(1)
      expect(result[0].layerIds).toContain('parent-ds-sub')
    })

    it('returns an empty array when sublayers exist but none have hidden features', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      expect(dataset.getLayersWithFilters()).toEqual([])
    })
  })

  describe('sourceId', () => {
    it('returns the parent sourceId for a sublayer', () => {
      const parent = datasetRegistry.getDataset('existing-fields')
      const sublayer = datasetRegistry.getDataset('land-covers-130-131')
      expect(sublayer.sourceId).toBe(datasetRegistry.getDataset('land-covers').sourceId)
    })

    it('returns a tiles-based id for a tile dataset (array tiles)', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      const tilesKey = dataset.tiles.join(',')
      expect(dataset.sourceId).toBe(`tiles-${hashString(tilesKey)}`)
    })

    it('returns a tiles-based id when tiles is a plain string (line 76 non-array branch)', () => {
      const dataset = datasetRegistry.getDataset('ds-string-tiles')
      expect(dataset.sourceId).toBe(`tiles-${hashString('https://example.com/{z}/{x}/{y}')}`)
    })

    it('returns geojson-dynamic-{id} for a dynamic geojson source', () => {
      expect(datasetRegistry.getDataset('ds-dynamic').sourceId).toBe('geojson-dynamic-ds-dynamic')
    })

    it('returns geojson-{hash} for a static string geojson url', () => {
      expect(datasetRegistry.getDataset('ds-static-url').sourceId).toBe(`geojson-${hashString('https://example.com/static.geojson')}`)
    })

    it('returns geojson-{id} for an object geojson source', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      expect(dataset.sourceId).toBe('geojson-historic-monuments')
    })

    it('returns source-{id} when there are no tiles and no geojson', () => {
      expect(datasetRegistry.getDataset('ds-bare').sourceId).toBe('source-ds-bare')
    })
  })

  describe('source', () => {
    it('returns a vector source for a tile dataset', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      const source = dataset.source
      expect(source.type).toBe('vector')
      expect(source.tiles).toEqual(dataset.tiles)
      expect(source.minzoom).toBe(10)
      expect(source.maxzoom).toBe(24)
    })

    it('falls back to 0 for minzoom when minZoom is not set (line 92)', () => {
      expect(datasetRegistry.getDataset('ds-no-minzoom').source.minzoom).toBe(0)
    })

    it('falls back to MAX_TILE_ZOOM when maxZoom is not set (line 93)', () => {
      expect(datasetRegistry.getDataset('ds-no-maxzoom').source.maxzoom).toBe(MAX_TILE_ZOOM)
    })

    it('returns a geojson source with empty FeatureCollection for a dynamic geojson source', () => {
      const dataset = datasetRegistry.getDataset('ds-dynamic')
      const source = dataset.source
      expect(source.type).toBe('geojson')
      expect(source.data).toEqual({ type: 'FeatureCollection', features: [] })
      expect(source.generateId).toBe(true)
    })

    it('returns a geojson source with the geojson data for an object geojson source', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      const source = dataset.source
      expect(source.type).toBe('geojson')
      expect(source.data).toBe(dataset.geojson)
      expect(source.generateId).toBe(true)
    })

    it('returns null when there are no tiles and no geojson', () => {
      expect(datasetRegistry.getDataset('ds-bare').source).toBeNull()
    })
  })

  describe('getSymbolSource', () => {
    it('returns a symbol layer spec with the correct shape', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments-prehistoric')
      const result = dataset.getSymbolSource('my-icon', null, null)
      expect(result.id).toBe(dataset.symbolLayerId)
      expect(result.type).toBe('symbol')
      expect(result.source).toBe(dataset.sourceId)
      expect(result.layout.visibility).toBe(dataset.visibility)
      expect(result.layout['icon-image']).toBe('my-icon')
      expect(result.layout['icon-allow-overlap']).toBe(true)
    })

    it('uses the provided anchor when given', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments-prehistoric')
      const result = dataset.getSymbolSource('icon', [0.1, 0.9], null)
      expect(result.layout['icon-anchor']).toBeDefined()
    })

    it('falls back to symbolDef.anchor when no anchor is provided', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments-prehistoric')
      const result = dataset.getSymbolSource('icon', null, { anchor: [0.5, 0] })
      expect(result.layout['icon-anchor']).toBeDefined()
    })

    it('does not include a filter property when filter is null', () => {
      const result = datasetRegistry.getDataset('ds-sym-no-filter').getSymbolSource('icon', null, null)
      expect(result).not.toHaveProperty('filter')
    })

    it('includes a filter property when the dataset has a filter', () => {
      const result = datasetRegistry.getDataset('ds-sym-filter').getSymbolSource('icon', null, null)
      expect(result).toHaveProperty('filter')
    })
  })

  describe('getFillSource', () => {
    it('returns a fill layer spec with the correct shape', () => {
      const dataset = datasetRegistry.getDataset('ds-fill-only')
      const paint = { 'fill-color': '#ff0000' }
      const result = dataset.getFillSource(paint)
      expect(result.id).toBe(dataset.fillLayerId)
      expect(result.type).toBe('fill')
      expect(result.source).toBe(dataset.sourceId)
      expect(result.layout.visibility).toBe(dataset.visibility)
      expect(result.paint).toBe(paint)
    })

    it('does not include a filter property when filter is null', () => {
      const dataset = datasetRegistry.getDataset('ds-fill-only')
      const result = dataset.getFillSource({})
      expect(result).not.toHaveProperty('filter')
    })

    it('includes a filter property when the dataset has a filter', () => {
      const result = datasetRegistry.getDataset('ds-fill-filter').getFillSource({})
      expect(result).toHaveProperty('filter')
    })
  })

  describe('getStrokeSource', () => {
    it('returns a line layer spec with the correct shape', () => {
      const dataset = datasetRegistry.getDataset('hedge-control')
      const paint = { 'line-color': '#ff0000', 'line-width': 2 }
      const result = dataset.getStrokeSource(paint)
      expect(result.id).toBe(dataset.strokeLayerId)
      expect(result.type).toBe('line')
      expect(result.source).toBe(dataset.sourceId)
      expect(result.layout.visibility).toBe(dataset.visibility)
      expect(result.paint).toBe(paint)
    })

    it('does not include a filter property when filter is null', () => {
      const dataset = datasetRegistry.getDataset('hedge-control')
      const result = dataset.getStrokeSource({})
      expect(result).not.toHaveProperty('filter')
    })

    it('includes a filter property when the dataset has a filter', () => {
      const result = datasetRegistry.getDataset('ds-stroke-filter').getStrokeSource({})
      expect(result).toHaveProperty('filter')
    })
  })

  describe('_hiddenFeaturesIdExpression', () => {
    it('uses get(idProperty) when idProperty is set', () => {
      expect(datasetRegistry.getDataset('ds-id-prop')._hiddenFeaturesIdExpression).toEqual(['to-string', ['get', 'gid']])
    })

    it('uses the feature id when idProperty is not set', () => {
      expect(datasetRegistry.getDataset('ds-no-id-expr')._hiddenFeaturesIdExpression).toEqual(['to-string', ['id']])
    })
  })

  describe('_hiddenFeaturesFilter', () => {
    it('returns a filter expression when there are hidden features', () => {
      expect(datasetRegistry.getDataset('ds-hf-123')._hiddenFeaturesFilter).toEqual(
        ['!', ['in', ['to-string', ['id']], ['literal', ['1', '2', '3']]]]
      )
    })

    it('excludes feature id -1 from the filter', () => {
      // structure: ['!', ['in', idExpr, ['literal', [...ids]]]] — ids are at [1][2][1]
      const ids = datasetRegistry.getDataset('ds-hf-neg1')._hiddenFeaturesFilter[1][2][1]
      expect(ids).not.toContain('-1')
      expect(ids).toContain('5')
    })

    it('returns null when all hidden features are -1', () => {
      expect(datasetRegistry.getDataset('ds-hf-all-neg1')._hiddenFeaturesFilter).toBeNull()
    })

    it('returns null when hiddenFeatures is empty', () => {
      expect(datasetRegistry.getDataset('ds-hf-empty')._hiddenFeaturesFilter).toBeNull()
    })

    it('returns null when hiddenFeatures is not set', () => {
      expect(datasetRegistry.getDataset('ds-hf-none')._hiddenFeaturesFilter).toBeNull()
    })
  })

  describe('filter', () => {
    it('returns null when there is no filter and no hidden features', () => {
      expect(datasetRegistry.getDataset('ds-no-filter').filter).toBeNull()
    })

    it('returns the own filter directly when it is the only filter', () => {
      expect(datasetRegistry.getDataset('ds-own-filter').filter).toEqual(['==', ['get', 'type'], 'foo'])
    })

    it('returns ["all", parentFilter, ownFilter] when both parent and own filter are present', () => {
      const parentFilter = ['==', ['get', 'cat'], 'a']
      const childFilter = ['==', ['get', 'sub'], 'b']
      const parentDef = { id: 'p-filter', filter: parentFilter, sublayerIds: ['p-filter-child'], style: {} }
      const childDef = { id: 'p-filter-child', parentId: 'p-filter', filter: childFilter, style: {} }
      datasetRegistry.attach({ 'p-filter': parentDef, 'p-filter-child': childDef })
      const dataset = datasetRegistry.getDataset('p-filter-child')
      expect(dataset.filter).toEqual(['all', parentFilter, childFilter])
    })

    it('returns the hidden features filter directly when it is the only filter', () => {
      expect(datasetRegistry.getDataset('ds-hidden-only').filter).toEqual(['!', ['in', ['to-string', ['id']], ['literal', ['10']]]])
    })

    it('returns ["all", ...] when both own filter and hidden features filter are present', () => {
      const result = datasetRegistry.getDataset('ds-combined').filter
      expect(result[0]).toBe('all')
      expect(result).toContainEqual(['==', ['get', 'type'], 'foo'])
    })
  })
})
