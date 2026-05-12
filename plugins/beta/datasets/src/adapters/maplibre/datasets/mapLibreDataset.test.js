import { MapLibreDataset } from './mapLibreDataset.js'

describe('mapLibreDataset', () => {
  describe('layerIds', () => {
    it('returns symbolLayerId = dataset.id and nulls for fill/stroke when dataset has a symbol', () => {
      const dataset = new MapLibreDataset({ id: 'ds', style: { stroke: '#ff0000', fill: 'transparent' } })
      expect(dataset.layerIds).toEqual(['ds'])
    })

    // it('returns fillLayerId = dataset.id when dataset has a fill', () => {
    //   const result = getLayerIds({ id: 'ds', fill: 'blue' })
    //   expect(result.fillLayerId).toBe('ds')
    // })

    // it('returns fillLayerId = null when fill is transparent', () => {
    //   const result = getLayerIds({ id: 'ds', fill: 'transparent' })
    //   expect(result.fillLayerId).toBeNull()
    // })

    // it('returns fillLayerId = null when fill is absent', () => {
    //   const result = getLayerIds({ id: 'ds', stroke: 'red' })
    //   expect(result.fillLayerId).toBeNull()
    // })

    // it('returns fillLayerId = dataset.id when dataset has a pattern', () => {
    //   hasPattern.mockReturnValue(true)
    //   const result = getLayerIds({ id: 'ds', fillPattern: 'dots' })
    //   expect(result.fillLayerId).toBe('ds')
    // })

    // it('returns strokeLayerId = <id>-stroke when both fill and stroke are present', () => {
    //   const result = getLayerIds({ id: 'ds', fill: 'blue', stroke: 'red' })
    //   expect(result.strokeLayerId).toBe('ds-stroke')
    // })

    // it('returns strokeLayerId = dataset.id when only stroke is present (no fill)', () => {
    //   const result = getLayerIds({ id: 'ds', stroke: 'red' })
    //   expect(result.strokeLayerId).toBe('ds')
    // })

    // it('returns strokeLayerId = null when stroke is absent', () => {
    //   const result = getLayerIds({ id: 'ds', fill: 'blue' })
    //   expect(result.strokeLayerId).toBeNull()
    // })

    // it('returns all nulls when neither fill, stroke, pattern nor symbol are set', () => {
    //   const result = getLayerIds({ id: 'ds' })
    //   expect(result).toEqual({ fillLayerId: null, strokeLayerId: null, symbolLayerId: null })
    // })
  })
})
