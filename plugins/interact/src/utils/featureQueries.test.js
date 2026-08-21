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

  // mapbox-gl-draw (MapLibre only) moves a feature out of its `.cold` layer/source into a
  // `.hot` sibling the instant any of its own properties change — a click landing on a feature
  // that's since moved would otherwise silently fail to match any registered config at all.
  it('also registers the .cold/.hot sibling id, pointing at the same config', () => {
    const dataLayers = [{ layerId: 'point-symbol.cold', idProperty: 'id' }]
    const result = buildLayerConfigMap(dataLayers)
    expect(result['point-symbol.cold']).toBe(result['point-symbol.hot'])
    expect(result['point-symbol.hot']).toEqual({ layerId: 'point-symbol.cold', idProperty: 'id' })
  })

  it('does not add a sibling for a layer id with no cold/hot suffix', () => {
    const result = buildLayerConfigMap([{ layerId: 'field-parcels' }])
    expect(Object.keys(result)).toEqual(['field-parcels'])
  })

  describe('the "draw" entry', () => {
    it('matches its own literal id — OpenLayers has one real, single "draw" layer', () => {
      const config = { layerId: 'draw', idProperty: 'id' }
      const result = buildLayerConfigMap([config])
      expect(result.draw).toBe(config)
    })

    it('also matches any draw-prefixed id — MapLibre\'s dynamic per-feature layers', () => {
      const config = { layerId: 'draw', idProperty: 'id' }
      const result = buildLayerConfigMap([config])
      expect(result['draw-f1-fill']).toBe(config)
      expect(result['draw-f1-line']).toBe(config)
      expect(result['draw-f2-symbol']).toBe(config)
    })

    it('does not match an unrelated id, and returns undefined for it as before', () => {
      const result = buildLayerConfigMap([{ layerId: 'draw', idProperty: 'id' }])
      expect(result['field-parcels']).toBeUndefined()
    })

    it('without a "draw" entry configured, a draw-prefixed id matches nothing (plain object, no wildcard)', () => {
      const result = buildLayerConfigMap([{ layerId: 'field-parcels' }])
      expect(result['draw-f1-fill']).toBeUndefined()
    })
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
  const layerConfigMap = { layer1: { layerId: 'layer1' }, layer2: { layerId: 'layer2' } }

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

  it('prioritises point geometry over non-point when both match', () => {
    const polygon = { id: 'p1', layer: { id: 'layer1' }, geometry: { type: 'Polygon' } }
    const point = { id: 'p2', layer: { id: 'layer2' }, geometry: { type: 'Point' } }
    const result = findMatchingFeature([polygon, point], layerConfigMap)
    expect(result).toEqual({ feature: point, config: layerConfigMap.layer2 })
  })
})
