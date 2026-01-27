import { buildLayerConfigMap, getFeaturesAtPoint, findMatchingFeature } from './featureQueries.js'

describe('buildLayerConfigMap', () => {
  it('builds map from dataLayers array', () => {
    const dataLayers = [
      { layerId: 'layer1', name: 'Layer 1' },
      { layerId: 'layer2', name: 'Layer 2' }
    ]

    const result = buildLayerConfigMap(dataLayers)

    expect(result).toEqual({
      layer1: { layerId: 'layer1', name: 'Layer 1' },
      layer2: { layerId: 'layer2', name: 'Layer 2' }
    })
  })

  it('keys by layerId', () => {
    const dataLayers = [{ layerId: 'myLayer', extra: 'data' }]

    const result = buildLayerConfigMap(dataLayers)

    expect(result.myLayer).toBeDefined()
    expect(result.myLayer.layerId).toBe('myLayer')
  })

  it('returns empty object for empty array', () => {
    const result = buildLayerConfigMap([])

    expect(result).toEqual({})
  })

  it('handles single layer', () => {
    const dataLayers = [{ layerId: 'solo', value: 123 }]

    const result = buildLayerConfigMap(dataLayers)

    expect(Object.keys(result)).toHaveLength(1)
    expect(result.solo.value).toBe(123)
  })

  it('handles multiple layers', () => {
    const dataLayers = [
      { layerId: 'a' },
      { layerId: 'b' },
      { layerId: 'c' }
    ]

    const result = buildLayerConfigMap(dataLayers)

    expect(Object.keys(result)).toHaveLength(3)
  })
})

describe('getFeaturesAtPoint', () => {
  it('calls mapProvider.getFeaturesAtPoint with point', () => {
    const mockProvider = {
      getFeaturesAtPoint: jest.fn(() => [])
    }
    const point = { x: 100, y: 200 }

    getFeaturesAtPoint(mockProvider, point)

    expect(mockProvider.getFeaturesAtPoint).toHaveBeenCalledWith(point)
  })

  it('returns features array from provider', () => {
    const features = [{ id: 'f1' }, { id: 'f2' }]
    const mockProvider = {
      getFeaturesAtPoint: jest.fn(() => features)
    }

    const result = getFeaturesAtPoint(mockProvider, { x: 0, y: 0 })

    expect(result).toBe(features)
  })

  it('returns empty array when provider returns null', () => {
    const mockProvider = {
      getFeaturesAtPoint: jest.fn(() => null)
    }

    const result = getFeaturesAtPoint(mockProvider, { x: 0, y: 0 })

    expect(result).toEqual([])
  })

  it('returns empty array when provider is null', () => {
    const result = getFeaturesAtPoint(null, { x: 0, y: 0 })

    expect(result).toEqual([])
  })

  it('returns empty array when provider is undefined', () => {
    const result = getFeaturesAtPoint(undefined, { x: 0, y: 0 })

    expect(result).toEqual([])
  })

  it('catches errors and returns empty array', () => {
    const mockProvider = {
      getFeaturesAtPoint: jest.fn(() => {
        throw new Error('Query failed')
      })
    }

    const result = getFeaturesAtPoint(mockProvider, { x: 0, y: 0 })

    expect(result).toEqual([])
  })

  it('logs warning on error', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const mockProvider = {
      getFeaturesAtPoint: jest.fn(() => {
        throw new Error('Query failed')
      })
    }

    getFeaturesAtPoint(mockProvider, { x: 0, y: 0 })

    expect(consoleSpy).toHaveBeenCalledWith('Feature query failed:', expect.any(Error))
    consoleSpy.mockRestore()
  })
})

describe('findMatchingFeature', () => {
  const layerConfigMap = {
    enabledLayer: { layerId: 'enabledLayer', name: 'Enabled' },
    anotherLayer: { layerId: 'anotherLayer', name: 'Another' }
  }

  it('returns first feature with matching layerId in config', () => {
    const features = [
      { id: 'f1', layer: { id: 'unknownLayer' } },
      { id: 'f2', layer: { id: 'enabledLayer' } },
      { id: 'f3', layer: { id: 'anotherLayer' } }
    ]

    const result = findMatchingFeature(features, layerConfigMap)

    expect(result.feature.id).toBe('f2')
  })

  it('returns feature and config object', () => {
    const features = [{ id: 'f1', layer: { id: 'enabledLayer' } }]

    const result = findMatchingFeature(features, layerConfigMap)

    expect(result).toEqual({
      feature: { id: 'f1', layer: { id: 'enabledLayer' } },
      config: { layerId: 'enabledLayer', name: 'Enabled' }
    })
  })

  it('returns null when no matching layer', () => {
    const features = [
      { id: 'f1', layer: { id: 'unknownLayer' } }
    ]

    const result = findMatchingFeature(features, layerConfigMap)

    expect(result).toBeNull()
  })

  it('returns null for empty features array', () => {
    const result = findMatchingFeature([], layerConfigMap)

    expect(result).toBeNull()
  })

  it('handles feature without layer property', () => {
    const features = [{ id: 'f1' }]

    const result = findMatchingFeature(features, layerConfigMap)

    expect(result).toBeNull()
  })

  it('handles feature.layer without id property', () => {
    const features = [{ id: 'f1', layer: {} }]

    const result = findMatchingFeature(features, layerConfigMap)

    expect(result).toBeNull()
  })

  it('handles empty layerConfigMap', () => {
    const features = [{ id: 'f1', layer: { id: 'someLayer' } }]

    const result = findMatchingFeature(features, {})

    expect(result).toBeNull()
  })
})
