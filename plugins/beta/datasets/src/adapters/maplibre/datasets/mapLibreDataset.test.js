import { MapLibreDataset } from './mapLibreDataset.js'
import { datasetRegistry } from '../../../registry/datasetRegistry.js'
import { datasets } from '../../../reducers/__data__/demoDatasets.js'
import { mappedDatasetsReducer } from '../../../reducers/mappedDatasetsReducer.js'

describe('MapLibreDataset', () => {
  beforeEach(() => {
    const { mappedDatasets } = mappedDatasetsReducer({ datasets })
    datasetRegistry.attach(mappedDatasets)
    datasetRegistry.attachCreateDataset(def => new MapLibreDataset(def))
  })

  describe('layerIds', () => {
    it('returns [id] when dataset has a symbol', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { symbol: 'square' } })
      expect(dataset.layerIds).toEqual(['ds'])
    })

    it('returns [id, id-stroke] when dataset has both fill and stroke', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { fill: 'blue', stroke: '#ff0000' } })
      expect(dataset.layerIds).toEqual(['ds', 'ds-stroke'])
    })

    it('returns [id] when dataset has only fill', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { fill: 'blue' } })
      expect(dataset.layerIds).toEqual(['ds'])
    })

    it('returns [id] when dataset has only stroke', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { stroke: '#ff0000' } })
      expect(dataset.layerIds).toEqual(['ds'])
    })

    it('returns [id] when dataset has a fillPattern but no stroke', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { fillPattern: 'dots' } })
      expect(dataset.layerIds).toEqual(['ds'])
    })

    it('returns [id, id-stroke] when dataset has fillPattern and stroke', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { fillPattern: 'dots', stroke: '#ff0000' } })
      expect(dataset.layerIds).toEqual(['ds', 'ds-stroke'])
    })

    it('returns null when fill is transparent and there is no stroke, symbol, or pattern', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { fill: 'transparent' } })
      expect(dataset.layerIds).toBeNull()
    })

    it('returns null when dataset has no fill, stroke, symbol, or pattern', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: {} })
      expect(dataset.layerIds).toBeNull()
    })

    it('returns the combined layerIds from all sublayers', () => {
      const dataset = datasetRegistry.getDataset('historic-monuments')
      // Each sublayer inherits symbol: 'square' from the parent style → layerIds = [id]
      expect(dataset.layerIds).toEqual([
        'historic-monuments-prehistoric',
        'historic-monuments-roman',
        'historic-monuments-medieval'
      ])
    })
  })
})
