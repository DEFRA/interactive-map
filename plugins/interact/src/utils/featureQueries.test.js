import { buildLayerConfigMap, getFeaturesAtPoint, findMatchingFeature } from './featureQueries.js'

describe('buildLayerConfigMap', () => {
  it('builds map keyed by layerId, handles empty array', () => {
    const dataLayers = [
      { layerId: 'a', value: 1 },
      { layerId: 'b', value: 2 }
    ]

    const result = buildLayerConfigMap(dataLayers)
    expect(result).toEqual({
      a: { layerId: 'a', value: 1 },
      b: { layerId: 'b', value: 2 }
    })

    expect(buildLayerConfigMap([])).toEqual({})
  })
})

describe('getFeaturesAtPoint', () => {
  it('returns features or empty array, handles errors', () => {
    const features = [{ id: 'f1' }]
    const mockProvider = {
      getFeaturesAtPoint: jest.fn(() => features)
    }

    expect(getFeaturesAtPoint(mockProvider, { x: 0, y: 0 })).toBe(features)
    expect(getFeaturesAtPoint(null, { x: 0, y: 0 })).toEqual([])
    expect(getFeaturesAtPoint(undefined, { x: 0, y: 0 })).toEqual([])

    // error handling
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const errorProvider = { getFeaturesAtPoint: jest.fn(() => { throw new Error('fail') }) }
    expect(getFeaturesAtPoint(errorProvider, { x: 0, y: 0 })).toEqual([])
    expect(consoleSpy).toHaveBeenCalledWith('Feature query failed:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})

describe('findMatchingFeature', () => {
  const layerConfigMap = { layer1: { layerId: 'layer1' } }

  it('returns first feature matching config, null otherwise', () => {
    const features = [
      { id: 'f1', layer: { id: 'unknown' } },
      { id: 'f2', layer: { id: 'layer1' } }
    ]
    const result = findMatchingFeature(features, layerConfigMap)
    expect(result).toEqual({ feature: features[1], config: layerConfigMap.layer1 })

    expect(findMatchingFeature([], layerConfigMap)).toBeNull()
    expect(findMatchingFeature([{ id: 'f3', layer: {} }], layerConfigMap)).toBeNull()
    expect(findMatchingFeature([{ id: 'f4' }], layerConfigMap)).toBeNull()
    expect(findMatchingFeature([{ id: 'f5', layer: { id: 'other' } }], {})).toBeNull()
  })
})
