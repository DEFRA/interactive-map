import { MapLibreDataset } from './mapLibreDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { MAX_TILE_ZOOM } from '../layerIds.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('../../../registry/datasetRegistry.js')

describe('MapLibreDataset', () => {
  beforeEach(() => {
    datasetRegistry.attachCreateDataset(def => new MapLibreDataset(def))
    datasetRegistry.mockExtend({
      // layerIds
      'ds-fill-only': { id: 'ds-fill-only', visible: true, minZoom: 10, maxZoom: 24, style: { fill: 'blue' } },
      'ds-pattern-only': { id: 'ds-pattern-only', style: { fillPattern: 'dots' } },
      'ds-transparent-fill': { id: 'ds-transparent-fill', style: { fill: 'transparent' } },
      // shared: no special properties — used by layerIds, sourceId, source, visibility,
      //   _hiddenFeaturesIdExpression, _hiddenFeaturesFilter, and filter tests
      'ds-bare': { id: 'ds-bare' },
      'ds-no-id-prop': { id: 'ds-no-id-prop', geojson: 'https://example.com/data', transformRequest: () => {} },
      'ds-no-transform': { id: 'ds-no-transform', geojson: 'https://example.com/data', idProperty: 'id' },
      // shared: dynamic geojson — used by isDynamicSource, sourceId, and source tests
      'ds-dynamic': { id: 'ds-dynamic', geojson: 'https://example.com/data', idProperty: 'gid', transformRequest: () => {} },
      'ds-static-url': { id: 'ds-static-url', geojson: 'https://example.com/static.geojson' },
      // shared: tiles with no zoom — used by source minzoom and maxzoom fallback tests
      'ds-tiles-no-zoom': { id: 'ds-tiles-no-zoom', tiles: ['https://example.com/{z}/{x}/{y}'] },
      // getSymbolSource/getFillSource/getStrokeSource 'has filter' tests use historic-monuments-prehistoric and existing-fields from demo data
      // _hiddenFeaturesIdExpression: ds-dynamic reused (has idProperty: 'gid')
      // _hiddenFeaturesFilter — ds-hf-123 also reused in filter describe
      'ds-hf-123': { id: 'ds-hf-123', hiddenFeatures: [1, 2, 3] },
      'ds-hf-neg1': { id: 'ds-hf-neg1', hiddenFeatures: [-1, 5] },
      'ds-hf-all-neg1': { id: 'ds-hf-all-neg1', hiddenFeatures: [-1] },
      'ds-hf-empty': { id: 'ds-hf-empty', hiddenFeatures: [] },
      // filter
      'ds-combined': { id: 'ds-combined', filter: ['==', ['get', 'type'], 'foo'], hiddenFeatures: [5] }
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
      const dataset = datasetRegistry.getDataset('ds-bare')
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
      expect(datasetRegistry.getDataset('ds-dynamic').isDynamicSource).toBe(true)
    })

    it('returns false when geojson is an object', () => {
      expect(datasetRegistry.getDataset('historic-monuments').isDynamicSource).toBe(false)
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
      expect(datasetRegistry.getDataset('existing-fields').visibility).toBe('visible')
    })

    it('returns "none" when visible is false', () => {
      expect(datasetRegistry.getDataset('hedge-control').visibility).toBe('none')
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
      const dataset = datasetRegistry.getDataset('land-covers-130-131')
      const result = dataset.getLayersWithFilters()
      expect(result).toEqual([{
        layerIds: ['land-covers-130-131', 'land-covers-130-131-stroke'],
        filter: ['all',
          ['!', ['in', ['to-string', ['id']], ['literal', ['42']]]],
          ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]]]
      }])
    })

    it('includes sublayer entries when a sublayer has hidden features', () => {
      const parentDef = { id: 'parent-ds', sublayerIds: ['parent-ds-sub'] }
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
      const sublayer = datasetRegistry.getDataset('land-covers-130-131')
      expect(sublayer.sourceId).toBe(datasetRegistry.getDataset('land-covers').sourceId)
    })

    it('returns a tiles-based id for a tile dataset (array tiles)', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      expect(dataset.sourceId).toBe('tiles-3delfuv')
    })

    it('returns a tiles-based id when tiles is a plain string (line 76 non-array branch)', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      expect(dataset.sourceId).toBe('tiles-3delfuv')
    })

    it('returns geojson-dynamic-{id} for a dynamic geojson source', () => {
      expect(datasetRegistry.getDataset('ds-dynamic').sourceId).toBe('geojson-dynamic-ds-dynamic')
    })

    it('returns geojson-{hash} for a static string geojson url', () => {
      expect(datasetRegistry.getDataset('ds-static-url').sourceId).toBe('geojson-1u4xay')
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
      expect(datasetRegistry.getDataset('existing-fields').source).toEqual({
        type: 'vector',
        tiles: 'https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges/{z}/{x}/{y}',
        minzoom: 10,
        maxzoom: 24
      })
    })

    it('falls back to 0/MAX_TILE_ZOOM for minzoom/maxzoom when zoom is not set', () => {
      expect(datasetRegistry.getDataset('ds-tiles-no-zoom').source).toEqual({
        type: 'vector',
        tiles: ['https://example.com/{z}/{x}/{y}'],
        minzoom: 0,
        maxzoom: MAX_TILE_ZOOM
      })
    })

    it('returns a geojson source with empty FeatureCollection for a dynamic geojson source', () => {
      expect(datasetRegistry.getDataset('ds-dynamic').source).toEqual({
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        generateId: true
      })
    })

    it('returns a geojson source with the geojson data for an object geojson source', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      expect(dataset.source).toEqual({ type: 'geojson', data: dataset.geojson, generateId: true })
    })

    it('returns null when there are no tiles and no geojson', () => {
      expect(datasetRegistry.getDataset('ds-bare').source).toBeNull()
    })
  })

  describe('getSymbolSource', () => {
    const prehistoricBase = {
      id: 'historic-monuments-prehistoric',
      type: 'symbol',
      source: 'geojson-historic-monuments',
      'source-layer': undefined,
      minzoom: 6, // datasetDefaults.minZoom applied to sublayer (parent's 10 is not inherited)
      maxzoom: 24,
      filter: ['in', ['get', 'category'], 'prehistoric']
    }

    it('returns a symbol layer spec with the correct shape', () => {
      expect(datasetRegistry.getDataset('historic-monuments-prehistoric').getSymbolSource('my-icon', null, null)).toEqual({
        ...prehistoricBase,
        layout: { visibility: 'visible', 'icon-image': 'my-icon', 'icon-anchor': 'center', 'icon-allow-overlap': true }
      })
    })

    it('uses the provided anchor when given', () => {
      expect(datasetRegistry.getDataset('historic-monuments-prehistoric').getSymbolSource('icon', [0.1, 0.9], null)).toEqual({
        ...prehistoricBase,
        layout: { visibility: 'visible', 'icon-image': 'icon', 'icon-anchor': 'bottom-left', 'icon-allow-overlap': true }
      })
    })

    it('falls back to symbolDef.anchor when no anchor is provided', () => {
      expect(datasetRegistry.getDataset('historic-monuments-prehistoric').getSymbolSource('icon', null, { anchor: [0.5, 0] })).toEqual({
        ...prehistoricBase,
        layout: { visibility: 'visible', 'icon-image': 'icon', 'icon-anchor': 'top', 'icon-allow-overlap': true }
      })
    })

    it('does not include a filter property when filter is null', () => {
      expect(datasetRegistry.getDataset('historic-monuments').getSymbolSource('icon', null, null)).toEqual({
        id: null,
        type: 'symbol',
        source: 'geojson-historic-monuments',
        'source-layer': undefined,
        minzoom: 10,
        maxzoom: 24,
        layout: { visibility: 'visible', 'icon-image': 'icon', 'icon-anchor': 'center', 'icon-allow-overlap': true }
      })
    })

    it('includes a filter property when the dataset has a filter', () => {
      expect(datasetRegistry.getDataset('historic-monuments-prehistoric').getSymbolSource('icon', null, null)).toEqual({
        ...prehistoricBase,
        layout: { visibility: 'visible', 'icon-image': 'icon', 'icon-anchor': 'center', 'icon-allow-overlap': true }
      })
    })
  })

  describe('getFillSource', () => {
    const fillBase = {
      id: 'ds-fill-only',
      type: 'fill',
      source: 'source-ds-fill-only',
      'source-layer': undefined,
      minzoom: 10,
      maxzoom: 24,
      layout: { visibility: 'visible' }
    }

    it('returns a fill layer spec with the correct shape', () => {
      expect(datasetRegistry.getDataset('ds-fill-only').getFillSource({ 'fill-color': '#ff0000' })).toEqual({
        ...fillBase,
        paint: { 'fill-color': '#ff0000' }
      })
    })

    it('does not include a filter property when filter is null', () => {
      expect(datasetRegistry.getDataset('ds-fill-only').getFillSource({})).toEqual({ ...fillBase, paint: {} })
    })

    it('includes a filter property when the dataset has a filter', () => {
      expect(datasetRegistry.getDataset('existing-fields').getFillSource({})).toEqual({
        id: 'existing-fields',
        type: 'fill',
        source: 'tiles-3delfuv',
        'source-layer': 'field_parcels_filtered',
        minzoom: 10,
        maxzoom: 24,
        layout: { visibility: 'visible' },
        paint: {},
        filter: ['all', ['==', ['get', 'sbi'], '106223377'], ['==', ['get', 'is_dominant_land_cover'], true]]
      })
    })
  })

  describe('getStrokeSource', () => {
    it('returns a line layer spec with the correct shape', () => {
      expect(datasetRegistry.getDataset('hedge-control')
        .getStrokeSource({ 'line-color': '#ff0000', 'line-width': 2 }))
        .toEqual({
          id: 'hedge-control',
          type: 'line',
          source: 'tiles-3delfuv',
          'source-layer': 'hedge_control',
          minzoom: 10,
          maxzoom: 24,
          layout: { visibility: 'none' },
          paint: { 'line-color': '#ff0000', 'line-width': 2 }
        })
    })

    it('includes a filter property when the dataset has a filter', () => {
      expect(datasetRegistry.getDataset('existing-fields')
        .getStrokeSource({}))
        .toEqual({
          id: 'existing-fields-stroke',
          type: 'line',
          source: 'tiles-3delfuv',
          'source-layer': 'field_parcels_filtered',
          minzoom: 10,
          maxzoom: 24,
          layout: { visibility: 'visible' },
          paint: {},
          filter: ['all', ['==', ['get', 'sbi'], '106223377'], ['==', ['get', 'is_dominant_land_cover'], true]]
        })
    })
  })

  describe('_hiddenFeaturesIdExpression', () => {
    it('uses get(idProperty) when idProperty is set', () => {
      expect(datasetRegistry.getDataset('ds-dynamic')._hiddenFeaturesIdExpression).toEqual(['to-string', ['get', 'gid']])
    })

    it('uses the feature id when idProperty is not set', () => {
      expect(datasetRegistry.getDataset('ds-bare')._hiddenFeaturesIdExpression).toEqual(['to-string', ['id']])
    })
  })

  describe('filter', () => {
    it('returns null when there is no filter and no hidden features', () => {
      expect(datasetRegistry.getDataset('ds-bare').filter).toBeNull()
    })

    it('returns the own filter directly when it is the only filter', () => {
      expect(datasetRegistry.getDataset('historic-monuments-prehistoric').filter)
        .toEqual(['in', ['get', 'category'], 'prehistoric'])
    })

    it('returns ["all", parentFilter, ownFilter] when both parent and own filter are present', () => {
      const parentFilter = ['==', ['get', 'cat'], 'a']
      const childFilter = ['==', ['get', 'sub'], 'b']
      const parentDef = { id: 'p-filter', filter: parentFilter, sublayerIds: ['p-filter-child'] }
      const childDef = { id: 'p-filter-child', parentId: 'p-filter', filter: childFilter }
      datasetRegistry.attach({ 'p-filter': parentDef, 'p-filter-child': childDef })
      const dataset = datasetRegistry.getDataset('p-filter-child')
      expect(dataset.filter).toEqual(['all', parentFilter, childFilter])
    })

    it('returns the hidden features filter directly when it is the only filter', () => {
      expect(datasetRegistry.getDataset('ds-hf-123').filter)
        .toEqual(['!', ['in', ['to-string', ['id']], ['literal', ['1', '2', '3']]]])
    })

    it('returns ["all", ...] when both own filter and hidden features filter are present', () => {
      const { filter } = datasetRegistry.getDataset('ds-combined')
      expect(filter).toEqual([
        'all',
        ['==', ['get', 'type'], 'foo'],
        [
          '!',
          ['in', ['to-string', ['id']], ['literal', ['5']]]
        ]
      ])
    })
  })
})
