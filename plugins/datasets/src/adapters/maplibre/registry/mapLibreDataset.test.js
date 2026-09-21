import { MapLibreDataset } from './mapLibreDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { logger } from '../../../../../../src/services/logger.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('../../../registry/datasetRegistry.js')
jest.mock('../../../../../../src/services/logger.js')

describe('MapLibreDataset', () => {
  beforeEach(() => {
    logger.warn.mockClear()
    datasetRegistry.attachCreateDataset(def => new MapLibreDataset(def))
    datasetRegistry.mockExtend({
      // layerIds
      'ds-fill-only': { id: 'ds-fill-only', visible: true, minZoom: 10, maxZoom: 24, style: { fill: 'blue' } },
      'ds-pattern-only': { id: 'ds-pattern-only', style: { fillPattern: 'dots' } },
      'ds-transparent-fill': { id: 'ds-transparent-fill', style: { fill: 'transparent' } },
      // shared: no special properties — used by layerIds, source, and visibility tests
      'ds-bare': { id: 'ds-bare' },
      'ds-no-id-prop': { id: 'ds-no-id-prop', geojson: 'https://example.com/data', transformRequest: () => {} },
      'ds-no-transform': { id: 'ds-no-transform', geojson: 'https://example.com/data', idProperty: 'id' },
      // shared: tiles with no zoom — used by source minzoom and maxzoom fallback tests
      'ds-tiles-no-zoom': { id: 'ds-tiles-no-zoom', tiles: ['https://example.com/{z}/{x}/{y}'] },
      // getSymbolSource/getFillSource/getStrokeSource 'has filter' tests use historic-monuments-prehistoric and existing-fields from demo data
      // _geojsonIdStrategy string-id warning
      'ds-string-ids': { id: 'ds-string-ids', geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', id: 'feature-1', properties: {}, geometry: null }] } },
      'ds-integer-ids': { id: 'ds-integer-ids', geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', id: 1, properties: {}, geometry: null }] } }
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

  describe('visibility', () => {
    it('returns "visible" when visible is true', () => {
      expect(datasetRegistry.getDataset('existing-fields').visibility).toBe('visible')
    })

    it('returns "none" when visible is false', () => {
      expect(datasetRegistry.getDataset('hedge-control').visibility).toBe('none')
    })
  })

  // The full behavioural matrix for getLayersWithValue (recursion, condition-gating,
  // multi-sublayer aggregation) is shared logic, tested generically against the base Dataset
  // class in dataset.test.js — this is a thin smoke test confirming it still produces the
  // real, MapLibre-shaped (up to 3 ids per leaf) result for actual demo fixtures.
  describe('getLayersWithVisibility', () => {
    it('returns layerIds and visibility for a layer with sublayers', () => {
      const registryDataset = datasetRegistry.getDataset('land-covers')
      const layersWithVisibility = registryDataset.getLayersWithVisibility()
      expect(layersWithVisibility).toEqual([
        { layerIds: ['land-covers-130-131', 'land-covers-130-131-stroke'], visibility: 'visible' },
        { layerIds: ['land-covers-332', 'land-covers-332-stroke'], visibility: 'visible' },
        { layerIds: ['land-covers-110', 'land-covers-110-stroke'], visibility: 'visible' },
        { layerIds: ['land-covers-379', 'land-covers-379-stroke'], visibility: 'none' },
        { layerIds: ['land-covers-other', 'land-covers-other-stroke'], visibility: 'visible' }
      ])
    })
  })

  // The full behavioural matrix for getLayersWithValue (recursion, condition-gating,
  // multi-sublayer aggregation) is shared logic, tested generically against the base Dataset
  // class in dataset.test.js — this is a thin smoke test confirming it still produces the
  // real, MapLibre-shaped (up to 3 ids per leaf) result for actual demo fixtures.
  describe('getLayersWithOpacity', () => {
    it('returns layerIds and opacity for a sublayer with no sublayers', () => {
      const dataset = datasetRegistry.getDataset('existing-fields')
      expect(dataset.getLayersWithOpacity()).toEqual([{ layerIds: ['existing-fields', 'existing-fields-stroke'], opacity: 1 }])
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

  // See getLayersWithOpacity's comment above — same "thin smoke test, full matrix lives in
  // dataset.test.js" split applies here.
  describe('getLayersWithFilters', () => {
    it('returns an entry with layerIds and filter when the dataset has hidden features', () => {
      const dataset = datasetRegistry.getDataset('land-covers-130-131')
      expect(dataset.getLayersWithFilters()).toEqual([{
        layerIds: ['land-covers-130-131', 'land-covers-130-131-stroke'],
        filter: ['all',
          ['!', ['in', ['to-string', ['get', 'id']], ['literal', ['42']]]],
          ['in', ['get', 'dominant_land_cover'], ['literal', ['130', '131']]]]
      }])
    })
  })

  describe('source', () => {
    it('returns a vector source for a tile dataset', () => {
      expect(datasetRegistry.getDataset('existing-fields').source).toEqual({
        type: 'vector',
        tiles: 'https://farming-tiles-702a60f45633.herokuapp.com/field_parcels_with_hedges_wgs84/{z}/{x}/{y}',
        minzoom: 10,
        maxzoom: 24
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

    it('returns a geojson source with promoteId when the dynamic source has idProperty', () => {
      expect(datasetRegistry.getDataset('land-covers').source).toEqual({
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'id'
      })
    })

    it('returns a geojson source with promoteId when static geojson has idProperty', () => {
      expect(datasetRegistry.getDataset('ds-no-transform').source).toEqual({
        type: 'geojson',
        data: 'https://example.com/data',
        promoteId: 'id'
      })
    })

    it('returns a geojson source with generateId when generateIds is true', () => {
      datasetRegistry.mockExtend({ 'ds-generate-ids': { id: 'ds-generate-ids', geojson: 'https://example.com/data', generateIds: true } })
      expect(datasetRegistry.getDataset('ds-generate-ids').source).toEqual({
        type: 'geojson',
        data: 'https://example.com/data',
        generateId: true
      })
    })

    it('returns a plain geojson source with no id strategy when neither idProperty nor generateIds is set', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      expect(dataset.source).toEqual({ type: 'geojson', data: dataset.geojson })
    })

    it('returns null when there are no tiles and no geojson', () => {
      expect(datasetRegistry.getDataset('ds-bare').source).toBeNull()
    })

    it('warns when geojson features have string native IDs and no id strategy is set', () => {
      expect(datasetRegistry.getDataset('ds-string-ids').source).toEqual(expect.objectContaining({ type: 'geojson' }))
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('"ds-string-ids"'))
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('string native IDs'))
    })

    it('does not warn when geojson features have integer native IDs', () => {
      expect(datasetRegistry.getDataset('ds-integer-ids').source).toEqual(expect.objectContaining({ type: 'geojson' }))
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('does not warn when idProperty is set even if features have string native IDs', () => {
      datasetRegistry.mockExtend({ 'ds-string-with-prop': { id: 'ds-string-with-prop', idProperty: 'myId', geojson: { type: 'FeatureCollection', features: [{ type: 'Feature', id: 'f-1', properties: { myId: 1 }, geometry: null }] } } })
      expect(datasetRegistry.getDataset('ds-string-with-prop').source).toEqual(expect.objectContaining({ type: 'geojson' }))
      expect(logger.warn).not.toHaveBeenCalled()
    })

    it('adds promoteId keyed by sourceLayer when a vector source has both idProperty and sourceLayer', () => {
      datasetRegistry.mockExtend({ 'ds-tiles-id-prop': { id: 'ds-tiles-id-prop', tiles: ['https://example.com/{z}/{x}/{y}'], idProperty: 'myId', sourceLayer: 'my-layer' } })
      expect(datasetRegistry.getDataset('ds-tiles-id-prop').source).toEqual(expect.objectContaining({
        type: 'vector',
        promoteId: { 'my-layer': 'myId' }
      }))
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
        source: 'tiles-35m5lrb',
        'source-layer': 'field_parcels_wgs84',
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
          source: 'tiles-35m5lrb',
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
          source: 'tiles-35m5lrb',
          'source-layer': 'field_parcels_wgs84',
          minzoom: 10,
          maxzoom: 24,
          layout: { visibility: 'visible' },
          paint: {},
          filter: ['all', ['==', ['get', 'sbi'], '106223377'], ['==', ['get', 'is_dominant_land_cover'], true]]
        })
    })
  })

})
