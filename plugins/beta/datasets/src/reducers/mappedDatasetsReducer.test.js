import { mappedDatasetsReducer } from './mappedDatasetsReducer'
import { datasetDefaults } from '../defaults.js'

describe('mappedDatasetsReducer', () => {
  it('handles empty datasets', () => {
    const result = mappedDatasetsReducer({ datasets: [] })
    expect(result.mappedDatasets).toEqual({})
    expect(result.orderedDatasets).toEqual([])
  })

  it('handles missing datasets', () => {
    const result = mappedDatasetsReducer({})
    expect(result.mappedDatasets).toEqual({})
    expect(result.orderedDatasets).toEqual([])
  })

  it('maps a single dataset with no sublayers', () => {
    const state = {
      datasets: [{ id: 'roads', label: 'Roads', minZoom: 10 }]
    }
    const result = mappedDatasetsReducer(state)
    expect(result.mappedDatasets).toEqual({
      roads: { ...datasetDefaults, id: 'roads', label: 'Roads', minZoom: 10 }
    })
    expect(result.orderedDatasets).toEqual(['roads'])
  })

  it('maps multiple datasets preserving order', () => {
    const state = {
      datasets: [
        { id: 'alpha', label: 'Alpha' },
        { id: 'beta', label: 'Beta' },
        { id: 'gamma', label: 'Gamma' }
      ]
    }
    const result = mappedDatasetsReducer(state)
    expect(result.orderedDatasets).toEqual(['alpha', 'beta', 'gamma'])
    expect(Object.keys(result.mappedDatasets)).toEqual(['alpha', 'beta', 'gamma'])
  })

  it('preserves other state properties', () => {
    const state = {
      datasets: [],
      someOtherProp: 'value',
      nested: { foo: 'bar' }
    }
    const result = mappedDatasetsReducer(state)
    expect(result.someOtherProp).toBe('value')
    expect(result.nested).toEqual({ foo: 'bar' })
  })

  describe('with sublayers', () => {
    const state = {
      datasets: [{
        id: 'land-covers',
        label: 'Land covers',
        sublayers: [
          { id: 'grassland', label: 'Grassland' },
          { id: 'woodland', label: 'Woodland', visibility: 'hidden' }
        ]
      }]
    }

    it('removes the sublayers property from the parent dataset', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers'].sublayers).toBeUndefined()
    })

    it('adds sublayerIds to the parent dataset', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers'].sublayerIds).toEqual([
        'land-covers-grassland',
        'land-covers-woodland'
      ])
    })

    it('adds flattened sublayers to mappedDatasets', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers-grassland']).toBeDefined()
      expect(result.mappedDatasets['land-covers-woodland']).toBeDefined()
    })

    it('sets compound id on flattened sublayer', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers-grassland'].id).toBe('land-covers-grassland')
    })

    it('sets parentId on flattened sublayer', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers-grassland'].parentId).toBe('land-covers')
    })

    it('sets sublayerId to the original sublayer id', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers-grassland'].sublayerId).toBe('grassland')
    })

    it('sets visibility to visible for sublayers without explicit visibility', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers-grassland'].visibility).toBe('visible')
    })

    it('preserves hidden visibility on sublayers', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.mappedDatasets['land-covers-woodland'].visibility).toBe('hidden')
    })

    it('includes sublayers in orderedDatasets after their parent', () => {
      const result = mappedDatasetsReducer(state)
      expect(result.orderedDatasets).toEqual([
        'land-covers',
        'land-covers-grassland',
        'land-covers-woodland'
      ])
    })
  })
})
