import {
  getSourceId, getFeatureLayerIds, createFeatureLayerGroup, removeFeatureLayerGroup, setFeatureLayerGroupData
} from './featureLayerGroup.js'

const mapStyle = { id: 'outdoor' }
const colors = { shapeFill: '#eee', shapeStroke: '#333', strokeWidth: 2 }

const fakeMap = () => {
  const sources = new Map()
  const layers = new Map()
  return {
    addSource: jest.fn((id, def) => sources.set(id, { setData: jest.fn(), _def: def })),
    getSource: jest.fn((id) => sources.get(id)),
    removeSource: jest.fn((id) => sources.delete(id)),
    addLayer: jest.fn((layer) => layers.set(layer.id, layer)),
    getLayer: jest.fn((id) => layers.get(id)),
    removeLayer: jest.fn((id) => layers.delete(id))
  }
}

const polygon = { id: 'p1', type: 'Feature', geometry: { type: 'Polygon', coordinates: [] }, properties: {} }
const line = { id: 'l1', type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} }
const point = { id: 'pt1', type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: {} }

describe('getSourceId / getFeatureLayerIds', () => {
  test('sourceId and layer ids are prefixed with the feature id', () => {
    expect(getSourceId('p1')).toBe('draw-p1')
    expect(getFeatureLayerIds('p1', 'Polygon')).toEqual(['draw-p1-line', 'draw-p1-fill'])
    expect(getFeatureLayerIds('l1', 'LineString')).toEqual(['draw-l1-line'])
    expect(getFeatureLayerIds('pt1', 'Point')).toEqual(['draw-pt1-symbol'])
  })
})

describe('createFeatureLayerGroup', () => {
  test('a Polygon gets one source and a line+fill layer pair, line above fill', () => {
    const map = fakeMap()
    const ids = createFeatureLayerGroup({ map, feature: polygon, mapStyle, colors, beforeId: 'anchor' })
    expect(map.addSource).toHaveBeenCalledWith('draw-p1', { type: 'geojson', data: { type: 'FeatureCollection', features: [polygon] } })
    expect(ids).toEqual(['draw-p1-line', 'draw-p1-fill'])
    // Chained, not both at the same beforeId — line sits directly below the anchor, fill
    // directly below line, so the pair ends up line-above-fill under the anchor.
    expect(map.addLayer).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'draw-p1-line', type: 'line' }), 'anchor')
    expect(map.addLayer).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'draw-p1-fill', type: 'fill' }), 'draw-p1-line')
  })

  test('a LineString gets just a line layer', () => {
    const map = fakeMap()
    const ids = createFeatureLayerGroup({ map, feature: line, mapStyle, colors, beforeId: 'anchor' })
    expect(ids).toEqual(['draw-l1-line'])
  })

  test('a feature with no geometry falls back to a symbol layer rather than throwing', () => {
    const map = fakeMap()
    const noGeometry = { id: 'x1', type: 'Feature', properties: {} }
    expect(() => createFeatureLayerGroup({ map, feature: noGeometry, mapStyle, colors, beforeId: 'anchor' })).not.toThrow()
  })

  test('a Point gets just a symbol layer', () => {
    const map = fakeMap()
    const ids = createFeatureLayerGroup({ map, feature: point, mapStyle, colors, beforeId: 'anchor' })
    expect(ids).toEqual(['draw-pt1-symbol'])
    expect(map.addLayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'draw-pt1-symbol', type: 'symbol' }), 'anchor')
  })

  // Regression test: symbolSelectedImageId is a precomputed variant resolvePointSymbol writes
  // onto every point regardless of selection state, not a live flag — coalescing to it
  // unconditionally showed every point permanently in its "selected" look.
  test('icon-image always uses the plain symbolImageId, never the precomputed selected variant', () => {
    const map = fakeMap()
    createFeatureLayerGroup({ map, feature: point, mapStyle, colors, beforeId: 'anchor' })
    const symbolLayer = map.addLayer.mock.calls[0][0]
    expect(symbolLayer.layout['icon-image']).toEqual(['get', 'symbolImageId'])
  })

  test('paint reads unprefixed, style-keyed properties, falling back to plugin colours', () => {
    const map = fakeMap()
    createFeatureLayerGroup({ map, feature: polygon, mapStyle, colors, beforeId: 'anchor' })
    const fillLayer = map.addLayer.mock.calls[1][0]
    expect(fillLayer.paint['fill-color']).toEqual(['coalesce', ['get', 'fillOutdoor'], ['get', 'fill'], colors.shapeFill])
  })
})

describe('removeFeatureLayerGroup', () => {
  test('removes every layer for the geometry type and the source', () => {
    const map = fakeMap()
    createFeatureLayerGroup({ map, feature: polygon, mapStyle, colors, beforeId: 'anchor' })
    removeFeatureLayerGroup({ map, featureId: 'p1', geometryType: 'Polygon' })
    expect(map.removeLayer).toHaveBeenCalledWith('draw-p1-line')
    expect(map.removeLayer).toHaveBeenCalledWith('draw-p1-fill')
    expect(map.removeSource).toHaveBeenCalledWith('draw-p1')
  })

  test('no-ops for layers/sources that no longer exist', () => {
    const map = fakeMap()
    expect(() => removeFeatureLayerGroup({ map, featureId: 'missing', geometryType: 'Point' })).not.toThrow()
    expect(map.removeLayer).not.toHaveBeenCalled()
    expect(map.removeSource).not.toHaveBeenCalled()
  })
})

describe('setFeatureLayerGroupData', () => {
  test('refreshes the source with the given feature', () => {
    const map = fakeMap()
    createFeatureLayerGroup({ map, feature: polygon, mapStyle, colors, beforeId: 'anchor' })
    const edited = { ...polygon, properties: { fill: 'red' } }
    setFeatureLayerGroupData({ map, featureId: 'p1', feature: edited })
    expect(map.getSource('draw-p1').setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [edited] })
  })

  test('empties the source when no feature is given (entering an edit session)', () => {
    const map = fakeMap()
    createFeatureLayerGroup({ map, feature: polygon, mapStyle, colors, beforeId: 'anchor' })
    setFeatureLayerGroupData({ map, featureId: 'p1' })
    expect(map.getSource('draw-p1').setData).toHaveBeenCalledWith({ type: 'FeatureCollection', features: [] })
  })

  test('no-ops when the source does not exist', () => {
    const map = fakeMap()
    expect(() => setFeatureLayerGroupData({ map, featureId: 'missing', feature: polygon })).not.toThrow()
  })
})
