import { MapLibreDataset } from './mapLibreDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
// Use the mock datasetRegistry with the demo datasets attached before each test
// so we can test Dataset methods that depend on parent/sublayer relationships and styles
jest.mock('../../../registry/datasetRegistry.js')

describe('MapLibreDataset', () => {
  beforeEach(() => {
    datasetRegistry.attachCreateDataset(def => new MapLibreDataset(def))
    datasetRegistry.mockExtend({
      'ds-fill-only': { id: 'ds-fill-only', style: { fill: 'blue' } },
      'ds-pattern-only': { id: 'ds-pattern-only', style: { fillPattern: 'dots' } },
      'ds-transparent-fill': { id: 'ds-transparent-fill', style: { fill: 'transparent' } },
      'ds-no-style': { id: 'ds-no-style', style: {} }
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
})
